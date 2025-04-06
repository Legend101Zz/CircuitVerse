import CircuitElement from "../circuitElement";
import Node, { findNode } from "../node";
import simulationArea from "../simulationArea";
import { correctWidth, lineTo, moveTo, rect2, fillText } from "../canvasApi";
import { colors } from "../themer/themer";

/**
 * @class
 * PISOShiftRegister - Parallel-In Serial-Out Shift Register
 * @extends CircuitElement
 * @param {number} x - x coordinate of element.
 * @param {number} y - y coordinate of element.
 * @param {Scope=} scope - Cirucit on which element is drawn
 * @param {string=} dir - direction of element
 * @param {number=} bitWidth - bit width per node, default is 1
 * @param {number=} size - number of bits in the register, default is 4
 * @category modules
 */
export default class PISOShiftRegister extends CircuitElement {
    constructor(
        x,
        y,
        scope = globalScope,
        dir = "RIGHT",
        bitWidth = 1,
        size = 4
    ) {
        super(x, y, scope, dir, bitWidth);
        this.rectangleObject = false;
        this.directionFixed = true;
        this.fixedBitWidth = true;

        // Initialize parameters
        this.size = size || parseInt(prompt("Enter number of bits:"), 10) || 4;

        // Set dimensions - make it more horizontal
        const width = Math.max(120, 80 + this.size * 10);
        const height = 80;
        this.setDimensions(width / 2, height / 2);

        // Initialize state
        this.state = new Array(this.size).fill(0);

        // Create control pins - distribute on different sides
        this.loadEnable = new Node(-width / 2, -20, 0, this, 1, "Load");
        this.clock = new Node(-width / 2, 0, 0, this, 1, "Clock");
        this.reset = new Node(-width / 2, 20, 0, this, 1, "Reset");

        // Output data pin
        this.dataOut = new Node(
            width / 2,
            0,
            1,
            this,
            this.bitWidth,
            "Data Out"
        );

        // Create parallel inputs - put on bottom
        this.inputs = [];
        const inputSpacing = Math.min(20, width / (this.size + 1));
        const startX = -width / 2 + inputSpacing;

        for (let i = 0; i < this.size; i++) {
            this.inputs.push(
                new Node(
                    startX + i * inputSpacing,
                    height / 2,
                    0,
                    this,
                    this.bitWidth,
                    `D${i}`
                )
            );
        }

        this.prevClockState = undefined;
    }

    /**
     * @memberof PISOShiftRegister
     * fn to create save Json Data of object
     * @return {JSON}
     */
    customSave() {
        const data = {
            nodes: {
                loadEnable: findNode(this.loadEnable),
                clock: findNode(this.clock),
                reset: findNode(this.reset),
                dataOut: findNode(this.dataOut),
                inputs: this.inputs.map(findNode),
            },
            constructorParamaters: [this.direction, this.bitWidth, this.size],
            values: {
                state: this.state,
            },
        };
        return data;
    }

    /**
     * @memberof PISOShiftRegister
     * resolve output values based on input data
     */
    resolve() {
        // Handle reset
        if (this.reset.value === 1) {
            this.state.fill(0);
            this.dataOut.value = 0;
            simulationArea.simulationQueue.add(this.dataOut);
            this.setOutputsUpstream(true);
            return;
        }

        // Detect rising edge of clock
        if (
            this.clock.value !== this.prevClockState &&
            this.clock.value === 1
        ) {
            // Check if load is enabled (parallel load)
            if (this.loadEnable.value === 1) {
                // Load parallel data
                for (let i = 0; i < this.size; i++) {
                    this.state[i] = this.inputs[i].value || 0;
                }
            } else {
                // Shift the data
                for (let i = 0; i < this.size - 1; i++) {
                    this.state[i] = this.state[i + 1];
                }
                this.state[this.size - 1] = 0; // Shift in 0
            }
        }
        this.prevClockState = this.clock.value;

        // Update output
        this.dataOut.value = this.state[0];
        simulationArea.simulationQueue.add(this.dataOut);
        this.setOutputsUpstream(true);
    }

    /**
     * @memberof PISOShiftRegister
     * function to draw element
     */
    customDraw() {
        const ctx = simulationArea.context;
        const xx = this.x;
        const yy = this.y;

        // Calculate dimensions
        const width = Math.max(120, 80 + this.size * 10);
        const height = 80;

        // Draw outer rectangle
        ctx.beginPath();
        ctx.strokeStyle = colors["stroke"];
        ctx.fillStyle = colors["fill"];
        ctx.lineWidth = correctWidth(3);
        rect2(
            ctx,
            -width / 2,
            -height / 2,
            width,
            height,
            xx,
            yy,
            this.direction
        );
        ctx.stroke();

        if (
            (this.hover && !simulationArea.shiftDown) ||
            simulationArea.lastSelected === this ||
            simulationArea.multipleObjectSelections.contains(this)
        ) {
            ctx.fillStyle = colors["hover_select"];
        }
        ctx.fill();

        // Draw title
        ctx.beginPath();
        ctx.font = "16px Raleway";
        ctx.fillStyle = colors["input_text"];
        ctx.textAlign = "center";
        fillText(ctx, "PISO SHIFT REGISTER", xx, yy - 40);
        fillText(ctx, `${this.size}-BIT`, xx, yy + 10);

        // Data bits visualization
        const boxSize = 14;
        const boxSpacing = Math.min(6, (width - 40) / this.size - boxSize);
        const totalBoxWidth = (boxSize + boxSpacing) * this.size - boxSpacing;
        const boxStartX = xx - totalBoxWidth / 2;
        const boxY = yy + 30;

        // Data input labels
        ctx.font = "8px Raleway";
        ctx.textAlign = "center";

        for (let i = 0; i < this.size; i++) {
            const boxX = boxStartX + i * (boxSize + boxSpacing);

            // Draw box
            ctx.beginPath();
            ctx.strokeStyle = colors["stroke"];
            ctx.lineWidth = correctWidth(1);
            ctx.rect(boxX, yy, boxSize, boxSize);
            ctx.stroke();

            // Fill box based on state
            if (this.state[this.size - 1 - i] === 1) {
                ctx.fillStyle = colors["stroke_alt"];
                ctx.fill();
                ctx.fillStyle = colors["fill"];
            }

            // Draw bit value
            ctx.font = "10px Raleway";
            ctx.textAlign = "center";
            ctx.fillStyle =
                this.state[this.size - 1 - i] === 1
                    ? colors["input_text"]
                    : colors["input_text"];
            fillText(
                ctx,
                this.state[this.size - 1 - i].toString(),
                boxX + boxSize / 2,
                boxY + 3
            );
        }

        // Draw shift direction arrow
        ctx.beginPath();
        ctx.strokeStyle = colors["stroke"];
        ctx.lineWidth = correctWidth(1.5);

        // Arrow line
        const arrowY = boxY - boxSize / 2 - 10;
        const arrowStartX = boxStartX + totalBoxWidth;
        const arrowEndX = boxStartX;

        ctx.moveTo(arrowStartX, arrowY);
        ctx.lineTo(arrowEndX, arrowY);

        // Arrow head
        ctx.moveTo(arrowEndX, arrowY);
        ctx.lineTo(arrowEndX + 5, arrowY - 3);
        ctx.moveTo(arrowEndX, arrowY);
        ctx.lineTo(arrowEndX + 5, arrowY + 3);

        ctx.stroke();
    }

    /**
     * @memberof PISOShiftRegister
     * function to change size of the shift register
     * @param {number} size - new size
     */
    changeSize(size) {
        if (size === undefined || size < 2 || size > 16) return;

        // Remove existing inputs
        for (let i = 0; i < this.inputs.length; i++) {
            this.inputs[i].delete();
        }

        // Update size and state
        this.size = size;
        this.state = new Array(this.size).fill(0);

        // Calculate new dimensions
        const width = Math.max(120, 80 + this.size * 10);
        const height = 80;
        this.setDimensions(width / 2, height / 2);

        // Create new inputs
        this.inputs = [];
        const inputSpacing = Math.min(20, width / (this.size + 1));
        const startX = -width / 2 + inputSpacing;

        for (let i = 0; i < this.size; i++) {
            this.inputs.push(
                new Node(
                    startX + i * inputSpacing,
                    height / 2,
                    0,
                    this,
                    this.bitWidth,
                    `D${i}`
                )
            );
        }
    }

    isResolvable() {
        return true;
    }

    static moduleVerilog() {
        return `
module PISOShiftRegister(input clk, input reset, input load, input [SIZE-1:0] d, output data_out);
  parameter SIZE = 4;
  reg [SIZE-1:0] state;
  
  always @(posedge clk or posedge reset) begin
    if (reset) begin
      state <= 0;
    end else if (load) begin
      state <= d;
    end else begin
      state <= {state[SIZE-2:0], 1'b0};
    end
  end
  
  assign data_out = state[SIZE-1];
endmodule
`;
    }
}

/**
 * @memberof PISOShiftRegister
 * Help Tip
 * @type {string}
 * @category modules
 */
PISOShiftRegister.prototype.tooltipText =
    "PISO Shift Register: Loads data in parallel, shifts out serially.";
PISOShiftRegister.prototype.helplink =
    "https://en.wikipedia.org/wiki/Shift_register";
PISOShiftRegister.prototype.objectType = "PISOShiftRegister";
PISOShiftRegister.prototype.mutableProperties = {
    size: {
        name: "Bit Size: ",
        type: "number",
        max: "16",
        min: "2",
        func: "changeSize",
    },
};

import CircuitElement from "../circuitElement";
import Node, { findNode } from "../node";
import simulationArea from "../simulationArea";
import {
    correctWidth,
    lineTo,
    moveTo,
    arc,
    rect2,
    fillText,
} from "../canvasApi";
import { colors } from "../themer/themer";

/**
 * @class
 * UniversalShiftRegister - A versatile shift register that can perform multiple operations
 * @extends CircuitElement
 * @param {number} x - x coordinate of element.
 * @param {number} y - y coordinate of element.
 * @param {Scope=} scope - Cirucit on which element is drawn
 * @param {string=} dir - direction of element
 * @param {number=} bitWidth - bit width per node, default is 1
 * @param {number=} size - number of bits in the register, default is 4
 * @category modules
 */
export default class UniversalShiftRegister extends CircuitElement {
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

        // Initialize state
        this.state = new Array(this.size).fill(0);

        // Control pins
        this.mode = new Node(-10, -40, 0, this, 2, "Mode"); // 2-bit control: 00-hold, 01-shift right, 10-shift left, 11-parallel load
        this.clock = new Node(-10, -20, 0, this, 1, "Clock");
        this.reset = new Node(-10, 0, 0, this, 1, "Reset");

        // Data pins
        this.serialInLeft = new Node(
            -10,
            20,
            0,
            this,
            this.bitWidth,
            "Serial In (Left)"
        );
        this.serialInRight = new Node(
            -10,
            40,
            0,
            this,
            this.bitWidth,
            "Serial In (Right)"
        );

        // Create parallel inputs and outputs
        this.parallelInputs = [];
        this.parallelOutputs = [];

        // Set dimensions based on the number of bits
        const height = Math.max(80, 60 + this.size * 15);
        this.setDimensions(20, height / 2);

        for (let i = 0; i < this.size; i++) {
            this.parallelInputs.push(
                new Node(-20, 60 + i * 20, 0, this, this.bitWidth, `D${i}`)
            );
            this.parallelOutputs.push(
                new Node(20, 60 + i * 20, 1, this, this.bitWidth, `Q${i}`)
            );
        }

        // Previous clock state
        this.prevClockState = undefined;
    }

    /**
     * @memberof UniversalShiftRegister
     * fn to create save Json Data of object
     * @return {JSON}
     */
    customSave() {
        const data = {
            nodes: {
                mode: findNode(this.mode),
                clock: findNode(this.clock),
                reset: findNode(this.reset),
                serialInLeft: findNode(this.serialInLeft),
                serialInRight: findNode(this.serialInRight),
                parallelInputs: this.parallelInputs.map(findNode),
                parallelOutputs: this.parallelOutputs.map(findNode),
            },
            constructorParamaters: [this.direction, this.bitWidth, this.size],
            values: {
                state: this.state,
            },
        };
        return data;
    }

    /**
     * @memberof UniversalShiftRegister
     * resolve output values based on input data
     */
    resolve() {
        // Handle reset
        if (this.reset.value === 1) {
            this.state.fill(0);

            // Update outputs
            for (let i = 0; i < this.size; i++) {
                this.parallelOutputs[i].value = 0;
                simulationArea.simulationQueue.add(this.parallelOutputs[i]);
            }

            this.setOutputsUpstream(true);
            return;
        }

        // Get mode value
        const mode = this.mode.value !== undefined ? this.mode.value : 0;

        // Detect rising edge of clock (clock transition from 0 to 1)
        if (
            this.clock.value !== this.prevClockState &&
            this.clock.value === 1
        ) {
            // Process based on mode
            switch (mode) {
                case 0: // Hold - do nothing
                    break;

                case 1: // Shift Right
                    for (let i = this.size - 1; i > 0; i--) {
                        this.state[i] = this.state[i - 1];
                    }
                    this.state[0] = this.serialInRight.value || 0;
                    break;

                case 2: // Shift Left
                    for (let i = 0; i < this.size - 1; i++) {
                        this.state[i] = this.state[i + 1];
                    }
                    this.state[this.size - 1] = this.serialInLeft.value || 0;
                    break;

                case 3: // Parallel Load
                    for (let i = 0; i < this.size; i++) {
                        this.state[i] = this.parallelInputs[i].value || 0;
                    }
                    break;

                default:
                    break;
            }
        }
        this.prevClockState = this.clock.value;

        // Update outputs
        for (let i = 0; i < this.size; i++) {
            this.parallelOutputs[i].value = this.state[i];
            simulationArea.simulationQueue.add(this.parallelOutputs[i]);
        }

        this.setOutputsUpstream(true);
    }

    /**
     * @memberof UniversalShiftRegister
     * function to draw element
     */
    customDraw() {
        const ctx = simulationArea.context;
        const xx = this.x;
        const yy = this.y;

        // Draw outer rectangle
        ctx.beginPath();
        ctx.strokeStyle = colors["stroke"];
        ctx.fillStyle = colors["fill"];
        ctx.lineWidth = correctWidth(3);
        const width = 40;
        const height = Math.max(80, 60 + this.size * 15);
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

        // Draw text
        ctx.beginPath();
        ctx.font = "10px Raleway";
        ctx.fillStyle = colors["input_text"];
        ctx.textAlign = "center";

        // Display current mode
        let modeText = "HOLD";
        if (this.mode.value === 1) modeText = "RIGHT";
        else if (this.mode.value === 2) modeText = "LEFT";
        else if (this.mode.value === 3) modeText = "LOAD";

        fillText(ctx, modeText, xx, yy - 70);

        // Draw state values - use smaller inline text
        ctx.font = "9px Raleway";
        for (let i = 0; i < this.size; i++) {
            const yPos = 60 + i * 15 - height / 2;
            // Only draw state values if they fit within the box
            if (yPos > -height / 2 + 30 && yPos < height / 2 - 5) {
                fillText(ctx, `${this.state[i]}`, xx, yy + yPos);
            }
        }
    }

    /**
     * @memberof UniversalShiftRegister
     * function to change size of the shift register
     * @param {number} size - new size
     */
    changeSize(size) {
        if (size === undefined || size < 2 || size > 16) return;

        // Remove existing inputs/outputs
        for (let i = 0; i < this.parallelInputs.length; i++) {
            this.parallelInputs[i].delete();
            this.parallelOutputs[i].delete();
        }

        // Update size and state
        this.size = size;
        this.state = new Array(this.size).fill(0);

        // Update dimensions based on the new size
        const height = Math.max(80, 60 + this.size * 15);
        this.setDimensions(20, height / 2);

        // Create new inputs/outputs
        this.parallelInputs = [];
        this.parallelOutputs = [];
        for (let i = 0; i < this.size; i++) {
            this.parallelInputs.push(
                new Node(-20, 60 + i * 15, 0, this, this.bitWidth, `D${i}`)
            );
            this.parallelOutputs.push(
                new Node(20, 60 + i * 15, 1, this, this.bitWidth, `Q${i}`)
            );
        }
    }

    subcircuitDraw(xOffset = 0, yOffset = 0) {
        var ctx = simulationArea.context;
        var xx = this.subcircuitMetadata.x + xOffset;
        var yy = this.subcircuitMetadata.y + yOffset;

        // Simplified version for subcircuit display
        ctx.beginPath();
        ctx.strokeStyle = colors["stroke"];
        ctx.fillStyle = colors["fill"];
        ctx.lineWidth = correctWidth(1);
        const width = 40;
        const height = 60; // Fixed smaller height for subcircuit view

        rect2(ctx, 0, 0, width, height, xx, yy, this.direction);

        if (
            (this.hover && !simulationArea.shiftDown) ||
            simulationArea.lastSelected === this ||
            simulationArea.multipleObjectSelections.contains(this)
        ) {
            ctx.fillStyle = colors["hover_select"];
        }
        ctx.fill();
        ctx.stroke();

        // Add text
        ctx.beginPath();
        ctx.font = "10px Raleway";
        ctx.fillStyle = colors["input_text"];
        ctx.textAlign = "center";
        fillText(ctx, "Shift", xx + width / 2, yy + 15);
        fillText(ctx, "Reg", xx + width / 2, yy + 25);
        fillText(ctx, `${this.size}-bit`, xx + width / 2, yy + 40);
    }

    static moduleVerilog() {
        return `
module UniversalShiftRegister(
  input clk,
  input reset,
  input [1:0] mode,  // 00-hold, 01-shift right, 10-shift left, 11-parallel load
  input serial_in_left,
  input serial_in_right,
  input [SIZE-1:0] d,
  output [SIZE-1:0] q
);
  parameter SIZE = 4;
  reg [SIZE-1:0] state;
  
  always @(posedge clk or posedge reset) begin
    if (reset) begin
      state <= 0;
    end else begin
      case (mode)
        2'b00: state <= state;  // Hold
        2'b01: state <= {serial_in_right, state[SIZE-1:1]};  // Shift right
        2'b10: state <= {state[SIZE-2:0], serial_in_left};  // Shift left
        2'b11: state <= d;  // Parallel load
      endcase
    end
  end
  
  assign q = state;
endmodule
`;
    }
}

/**
 * @memberof UniversalShiftRegister
 * Help Tip
 * @type {string}
 * @category modules
 */
UniversalShiftRegister.prototype.tooltipText =
    "Universal Shift Register: Can hold, shift left, shift right, or load in parallel based on mode input.";
UniversalShiftRegister.prototype.helplink =
    "https://en.wikipedia.org/wiki/Shift_register#Universal_shift_register";
UniversalShiftRegister.prototype.objectType = "UniversalShiftRegister";
UniversalShiftRegister.prototype.mutableProperties = {
    size: {
        name: "Bit Size: ",
        type: "number",
        max: "16",
        min: "2",
        func: "changeSize",
    },
};
UniversalShiftRegister.prototype.canShowInSubcircuit = true;
UniversalShiftRegister.prototype.layoutProperties = {
    rightDimensionX: 20,
    leftDimensionX: 20,
    upDimensionY: 40,
    downDimensionY: 40,
};

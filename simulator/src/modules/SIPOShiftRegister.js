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
 * SIPOShiftRegister - Serial-In Parallel-Out Shift Register
 * @extends CircuitElement
 * @param {number} x - x coordinate of element.
 * @param {number} y - y coordinate of element.
 * @param {Scope=} scope - Cirucit on which element is drawn
 * @param {string=} dir - direction of element
 * @param {number=} bitWidth - bit width per node, default is 1
 * @param {number=} size - number of bits in the register, default is 4
 * @category modules
 */
export default class SIPOShiftRegister extends CircuitElement {
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
        this.setDimensions(15, 40);
        this.directionFixed = true;
        this.fixedBitWidth = true;

        // Initialize parameters
        this.size = size || parseInt(prompt("Enter number of bits:"), 10) || 4;

        // Set dimensions based on size to ensure enough space for all pins
        const height = Math.max(40, 20 + this.size * 20);
        this.setDimensions(15, height / 2);

        // Initialize state
        this.state = new Array(this.size).fill(0);

        // Create pins
        this.dataIn = new Node(-10, -20, 0, this, this.bitWidth, "Data In");
        this.clock = new Node(-10, 0, 0, this, 1, "Clock");
        this.reset = new Node(-10, 20, 0, this, 1, "Reset");

        // Create outputs
        this.outputs = [];
        const outputSpacing = 20;
        for (let i = 0; i < this.size; i++) {
            this.outputs.push(
                new Node(
                    20,
                    -height / 2 + 20 + i * outputSpacing,
                    1,
                    this,
                    this.bitWidth,
                    `Q${i}`,
                ),
            );
        }

        // Previous clock state
        this.prevClockState = undefined;
    }

    /**
     * @memberof SIPOShiftRegister
     * fn to create save Json Data of object
     * @return {JSON}
     */
    customSave() {
        const data = {
            nodes: {
                dataIn: findNode(this.dataIn),
                clock: findNode(this.clock),
                reset: findNode(this.reset),
                outputs: this.outputs.map(findNode),
            },
            constructorParamaters: [this.direction, this.bitWidth, this.size],
            values: {
                state: this.state,
            },
        };
        return data;
    }

    /**
     * @memberof SIPOShiftRegister
     * resolve output values based on input data
     */
    resolve() {
        // Handle reset
        if (this.reset.value === 1) {
            this.state.fill(0);

            // Update outputs
            for (let i = 0; i < this.size; i++) {
                this.outputs[i].value = this.state[i];
                simulationArea.simulationQueue.add(this.outputs[i]);
            }

            this.setOutputsUpstream(true);
            return;
        }

        // Detect rising edge of clock (clock transition from 0 to 1)
        if (
            this.clock.value !== this.prevClockState &&
            this.clock.value === 1
        ) {
            // Shift the data
            for (let i = this.size - 1; i > 0; i--) {
                this.state[i] = this.state[i - 1];
            }

            // Input the new bit
            this.state[0] = this.dataIn.value || 0;
        }
        this.prevClockState = this.clock.value;

        // Update outputs
        for (let i = 0; i < this.size; i++) {
            this.outputs[i].value = this.state[i];
            simulationArea.simulationQueue.add(this.outputs[i]);
        }

        this.setOutputsUpstream(true);
    }

    /**
     * @memberof SIPOShiftRegister
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
        const width = 30;
        const height = Math.max(40, 10 + this.size * 15);
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
        ctx.font = "12px Raleway";
        ctx.fillStyle = colors["input_text"];
        ctx.textAlign = "center";
        fillText(ctx, "SIPO", xx, yy - height / 2);

        // Draw state values
        for (let i = 0; i < this.size; i++) {
            fillText(
                ctx,
                this.state[i].toString(),
                xx,
                yy - height / 2 + 15 + i * 15
            );
        }
    }

    /**
     * @memberof SIPOShiftRegister
     * function to change size of the shift register
     * @param {number} size - new size
     */
    changeSize(size) {
        if (size === undefined || size < 2 || size > 16) return;

        // Remove existing outputs
        for (let i = 0; i < this.outputs.length; i++) {
            this.outputs[i].delete();
        }

        // Update size and state
        this.size = size;
        this.state = new Array(this.size).fill(0);

        // Create new outputs
        this.outputs = [];
        for (let i = 0; i < this.size; i++) {
            this.outputs.push(
                new Node(20, -20 + i * 15, 1, this, this.bitWidth, `Q${i}`)
            );
        }
    }

    static moduleVerilog() {
        return `
module SIPOShiftRegister(input clk, input reset, input data_in, output reg [SIZE-1:0] q);
  parameter SIZE = 4;
  
  always @(posedge clk or posedge reset) begin
    if (reset) begin
      q <= 0;
    end else begin
      q <= {q[SIZE-2:0], data_in};
    end
  end
endmodule
`;
    }
}

/**
 * @memberof SIPOShiftRegister
 * Help Tip
 * @type {string}
 * @category modules
 */
SIPOShiftRegister.prototype.tooltipText =
    "Serial-In Parallel-Out (SIPO) Shift Register: Shifts in data serially and outputs all bits in parallel.";
SIPOShiftRegister.prototype.helplink =
    "https://en.wikipedia.org/wiki/Shift_register";
SIPOShiftRegister.prototype.objectType = "SIPOShiftRegister";
SIPOShiftRegister.prototype.mutableProperties = {
    size: {
        name: "Bit Size: ",
        type: "number",
        max: "16",
        min: "2",
        func: "changeSize",
    },
};

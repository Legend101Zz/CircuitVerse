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
 * PIPOShiftRegister - Parallel-In Parallel-Out Shift Register
 * @extends CircuitElement
 * @param {number} x - x coordinate of element.
 * @param {number} y - y coordinate of element.
 * @param {Scope=} scope - Cirucit on which element is drawn
 * @param {string=} dir - direction of element
 * @param {number=} bitWidth - bit width per node, default is 1
 * @param {number=} size - number of bits in the register, default is 4
 * @category modules
 */
export default class PIPOShiftRegister extends CircuitElement {
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

        // Set dimensions based on register size
        const height = Math.max(80, 30 + this.size * 15);
        this.setDimensions(20, height / 2);

        // Initialize state
        this.state = new Array(this.size).fill(0);

        // Create control pins
        this.clock = new Node(-10, -20, 0, this, 1, "Clock");
        this.reset = new Node(-10, 0, 0, this, 1, "Reset");

        // Create parallel inputs and outputs
        this.inputs = [];
        this.outputs = [];
        for (let i = 0; i < this.size; i++) {
            this.inputs.push(
                new Node(-20, 20 + i * 20, 0, this, this.bitWidth, `D${i}`)
            );
            this.outputs.push(
                new Node(20, 20 + i * 20, 1, this, this.bitWidth, `Q${i}`)
            );
        }

        // Add nodes to nodeList for proper handling
        this.nodeList.push(this.clock);
        this.nodeList.push(this.reset);
        this.nodeList = this.nodeList.concat(this.inputs);
        this.nodeList = this.nodeList.concat(this.outputs);

        // Previous clock state
        this.prevClockState = undefined;
    }

    /**
     * @memberof PIPOShiftRegister
     * fn to create save Json Data of object
     * @return {JSON}
     */
    customSave() {
        const data = {
            nodes: {
                clock: findNode(this.clock),
                reset: findNode(this.reset),
                inputs: this.inputs.map(findNode),
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
     * Override isHover to provide custom hover behavior
     * This prevents hovering on input/output nodes
     */
    isHover() {
        const mX = simulationArea.mouseXf - this.x;
        const mY = this.y - simulationArea.mouseYf;

        const height = Math.max(80, 30 + this.size * 15);
        const width = 40;

        return Math.abs(mX) <= width / 2 && Math.abs(mY) <= height / 2;
    }

    /**
     * @memberof PIPOShiftRegister
     * resolve output values based on input data
     */
    resolve() {
        // Handle reset
        if (this.reset.value === 1) {
            this.state.fill(0);

            // Update outputs
            for (let i = 0; i < this.size; i++) {
                this.outputs[i].value = 0;
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
            // Load all inputs in parallel
            for (let i = 0; i < this.size; i++) {
                this.state[i] = this.inputs[i].value || 0;
            }
        }
        this.prevClockState = this.clock.value;

        // Update all outputs in parallel (outputs always reflect current state)
        for (let i = 0; i < this.size; i++) {
            this.outputs[i].value = this.state[i];
            simulationArea.simulationQueue.add(this.outputs[i]);
        }

        this.setOutputsUpstream(true);
    }

    /**
     * @memberof PIPOShiftRegister
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
        const height = Math.max(170, 30 + this.size * 15);
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

        // Draw title and labels
        ctx.beginPath();
        ctx.font = "12px Raleway";
        ctx.textAlign = "center";
        ctx.fillStyle = colors["input_text"];
        fillText(ctx, "PIPO", xx, yy - height / 2 + 15);

        // Draw horizontal divider
        ctx.beginPath();
        ctx.strokeStyle = colors["stroke"];
        ctx.lineWidth = correctWidth(1);
        moveTo(ctx, -width / 2, -height / 2 + 25, xx, yy, this.direction);
        lineTo(ctx, width / 2, -height / 2 + 25, xx, yy, this.direction);
        ctx.stroke();

        // Draw state values with better formatting
        ctx.font = "6px Raleway";
        for (let i = 0; i < this.size; i++) {
            const label = `${this.state[i]}`;
            fillText(ctx, label, xx, yy + 30 + i * 15 + 3);
        }
    }

    /**
     * @memberof PIPOShiftRegister
     * function to change size of the shift register
     * @param {number} size - new size
     */
    changeSize(size) {
        if (size === undefined || size < 2 || size > 16) return;

        // Remove existing inputs/outputs from nodeList
        for (let i = 0; i < this.inputs.length; i++) {
            this.nodeList.clean(this.inputs[i]);
            this.nodeList.clean(this.outputs[i]);
        }

        // Remove existing inputs/outputs
        for (let i = 0; i < this.inputs.length; i++) {
            this.inputs[i].delete();
            this.outputs[i].delete();
        }

        // Update size and state
        this.size = size;
        this.state = new Array(this.size).fill(0);

        // Set new dimensions based on register size
        const height = Math.max(80, 30 + this.size * 15);
        this.setDimensions(20, height / 2);

        // Create new inputs/outputs
        this.inputs = [];
        this.outputs = [];
        for (let i = 0; i < this.size; i++) {
            this.inputs.push(
                new Node(-20, 20 + i * 15, 0, this, this.bitWidth, `D${i}`)
            );
            this.outputs.push(
                new Node(20, 20 + i * 15, 1, this, this.bitWidth, `Q${i}`)
            );

            // Add to nodeList for proper handling
            this.nodeList.push(this.inputs[i]);
            this.nodeList.push(this.outputs[i]);
        }
    }

    /**
     * @memberof PIPOShiftRegister
     * Method for subcircuit display
     */
    subcircuitDraw(xOffset = 0, yOffset = 0) {
        const ctx = simulationArea.context;
        const xx = this.subcircuitMetadata.x + xOffset;
        const yy = this.subcircuitMetadata.y + yOffset;

        const width = 40;
        const height = Math.max(40, 30 + Math.min(this.size, 4) * 10);

        // Draw outer box
        ctx.beginPath();
        ctx.strokeStyle = "#000";
        ctx.fillStyle = colors["fill"];
        ctx.lineWidth = correctWidth(1);
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
        ctx.font = "10px Raleway";
        ctx.textAlign = "center";
        ctx.fillStyle = "#000";
        fillText(ctx, "PIPO", xx, yy);

        // Show current bits if few enough
        if (this.size <= 4) {
            let bits = "";
            for (let i = 0; i < this.size; i++) {
                bits += this.state[i];
            }
            fillText(ctx, bits, xx, yy + 12);
        } else {
            fillText(ctx, `${this.size} bits`, xx, yy + 12);
        }
    }

    static moduleVerilog() {
        return `
module PIPOShiftRegister(input clk, input reset, input [SIZE-1:0] d, output [SIZE-1:0] q);
  parameter SIZE = 4;
  reg [SIZE-1:0] state;
  
  always @(posedge clk or posedge reset) begin
    if (reset) begin
      state <= 0;
    end else begin
      state <= d;
    end
  end
  
  assign q = state;
endmodule
`;
    }
}

/**
 * @memberof PIPOShiftRegister
 * Help Tip
 * @type {string}
 * @category modules
 */
PIPOShiftRegister.prototype.tooltipText =
    "Parallel-In Parallel-Out (PIPO) Shift Register: Loads data in parallel and outputs it in parallel, functioning as a temporary storage register.";
PIPOShiftRegister.prototype.helplink =
    "https://en.wikipedia.org/wiki/Shift_register";
PIPOShiftRegister.prototype.objectType = "PIPOShiftRegister";
PIPOShiftRegister.prototype.canShowInSubcircuit = true;
PIPOShiftRegister.prototype.layoutProperties = {
    rightDimensionX: 20,
    leftDimensionX: 20,
    upDimensionY: 40,
    downDimensionY: 40,
};
PIPOShiftRegister.prototype.mutableProperties = {
    size: {
        name: "Bit Size: ",
        type: "number",
        max: "16",
        min: "2",
        func: "changeSize",
    },
};

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
 * BidirectionalShiftRegister - A shift register that can shift left or right
 * @extends CircuitElement
 * @param {number} x - x coordinate of element.
 * @param {number} y - y coordinate of element.
 * @param {Scope=} scope - Cirucit on which element is drawn
 * @param {string=} dir - direction of element
 * @param {number=} bitWidth - bit width per node, default is 1
 * @param {number=} size - number of bits in the register, default is 4
 * @category modules
 */
export default class BidirectionalShiftRegister extends CircuitElement {
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
        this.setDimensions(15, 60);
        this.directionFixed = true;
        this.fixedBitWidth = true;

        // Initialize parameters
        this.size = size || parseInt(prompt("Enter number of bits:"), 10) || 4;

        // Initialize state
        this.state = new Array(this.size).fill(0);

        // Control pins
        this.shiftDirection = new Node(-10, -40, 0, this, 1, "Direction"); // 0 = shift right, 1 = shift left
        this.clock = new Node(-10, -20, 0, this, 1, "Clock");
        this.reset = new Node(-10, 0, 0, this, 1, "Reset");
        this.enable = new Node(-10, 20, 0, this, 1, "Enable"); // Active high shift enable

        // Data pins
        this.serialInLeft = new Node(
            -10,
            40,
            0,
            this,
            this.bitWidth,
            "Serial In (Left)"
        );
        this.serialInRight = new Node(
            -10,
            60,
            0,
            this,
            this.bitWidth,
            "Serial In (Right)"
        );

        // Create parallel outputs
        this.outputs = [];
        for (let i = 0; i < this.size; i++) {
            this.outputs.push(
                new Node(20, 20 + i * 20, 1, this, this.bitWidth, `Q${i}`)
            );
        }

        // Previous clock state
        this.prevClockState = undefined;
    }

    /**
     * @memberof BidirectionalShiftRegister
     * fn to create save Json Data of object
     * @return {JSON}
     */
    customSave() {
        const data = {
            nodes: {
                shiftDirection: findNode(this.shiftDirection),
                clock: findNode(this.clock),
                reset: findNode(this.reset),
                enable: findNode(this.enable),
                serialInLeft: findNode(this.serialInLeft),
                serialInRight: findNode(this.serialInRight),
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
     * @memberof BidirectionalShiftRegister
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
            this.clock.value === 1 &&
            this.enable.value === 1
        ) {
            // Determine shift direction
            const shiftLeft = this.shiftDirection.value === 1;

            if (shiftLeft) {
                // Shift left operation
                for (let i = 0; i < this.size - 1; i++) {
                    this.state[i] = this.state[i + 1];
                }
                // Input from right side
                this.state[this.size - 1] = this.serialInRight.value || 0;
            } else {
                // Shift right operation
                for (let i = this.size - 1; i > 0; i--) {
                    this.state[i] = this.state[i - 1];
                }
                // Input from left side
                this.state[0] = this.serialInLeft.value || 0;
            }
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
     * @memberof BidirectionalShiftRegister
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
        const height = Math.max(100, 70 + this.size * 15);
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

        ctx.fillStyle = colors["input_text"];
        ctx.textAlign = "center";
        fillText(ctx, "Bidirectional", xx, yy - height / 2 - 25);
        fillText(ctx, "Shift Register", xx, yy - height / 2 - 5);

        // Display current direction
        const dirText = this.shiftDirection.value === 1 ? "◄ LEFT" : "RIGHT ►";
        fillText(ctx, dirText, xx, yy - 45);

        // Draw state values
        for (let i = 0; i < this.size; i++) {
            fillText(
                ctx,
                this.state[i].toString(),
                xx,
                yy - height / 2 + 80 + i * 15
            );
        }
    }

    /**
     * @memberof BidirectionalShiftRegister
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
                new Node(20, 20 + i * 15, 1, this, this.bitWidth, `Q${i}`)
            );
        }
    }

    static moduleVerilog() {
        return `
module BidirectionalShiftRegister(
  input clk,
  input reset,
  input direction, // 0=right, 1=left
  input enable,
  input serial_in_left,
  input serial_in_right,
  output [SIZE-1:0] q
);
  parameter SIZE = 4;
  reg [SIZE-1:0] state;
  
  always @(posedge clk or posedge reset) begin
    if (reset) begin
      state <= 0;
    end else if (enable) begin
      if (direction) begin
        // Shift left
        state <= {state[SIZE-2:0], serial_in_right};
      end else begin
        // Shift right
        state <= {serial_in_left, state[SIZE-1:1]};
      end
    end
  end
  
  assign q = state;
endmodule
`;
    }
}

/**
 * @memberof BidirectionalShiftRegister
 * Help Tip
 * @type {string}
 * @category modules
 */
BidirectionalShiftRegister.prototype.tooltipText =
    "Bidirectional Shift Register: Can shift data either left or right based on the direction control input.";
BidirectionalShiftRegister.prototype.helplink =
    "https://en.wikipedia.org/wiki/Shift_register";
BidirectionalShiftRegister.prototype.objectType = "BidirectionalShiftRegister";
BidirectionalShiftRegister.prototype.mutableProperties = {
    size: {
        name: "Bit Size: ",
        type: "number",
        max: "16",
        min: "2",
        func: "changeSize",
    },
};

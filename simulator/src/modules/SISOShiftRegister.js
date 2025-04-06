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
 * SISOShiftRegister - Serial-In Serial-Out Shift Register
 * @extends CircuitElement
 * @param {number} x - x coordinate of element.
 * @param {number} y - y coordinate of element.
 * @param {Scope=} scope - Cirucit on which element is drawn
 * @param {string=} dir - direction of element
 * @param {number=} bitWidth - bit width per node, default is 1
 * @param {number=} size - number of bits in the register, default is 4
 * @category modules
 */
export default class SISOShiftRegister extends CircuitElement {
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

        // Calculate width based on size
        this.width = Math.max(80, this.size * 20);
        this.setDimensions(this.width / 2, 30);

        // Initialize state
        this.state = new Array(this.size).fill(0);

        // Create pins
        this.dataIn = new Node(
            -this.width / 2,
            -20,
            0,
            this,
            this.bitWidth,
            "Data In"
        );
        this.clock = new Node(-this.width / 2, 0, 0, this, 1, "Clock");
        this.reset = new Node(-this.width / 2, 20, 0, this, 1, "Reset");
        this.dataOut = new Node(
            this.width / 2,
            0,
            1,
            this,
            this.bitWidth,
            "Data Out"
        );

        // Previous clock state
        this.prevClockState = undefined;
    }

    /**
     * @memberof SISOShiftRegister
     * fn to create save Json Data of object
     * @return {JSON}
     */
    customSave() {
        const data = {
            nodes: {
                dataIn: findNode(this.dataIn),
                clock: findNode(this.clock),
                reset: findNode(this.reset),
                dataOut: findNode(this.dataOut),
            },
            constructorParamaters: [this.direction, this.bitWidth, this.size],
            values: {
                state: this.state,
            },
        };
        return data;
    }

    /**
     * @memberof SISOShiftRegister
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

        // Detect rising edge of clock (clock transition from 0 to 1)
        if (
            this.clock.value !== this.prevClockState &&
            this.clock.value === 1
        ) {
            // Shift the data through the register
            for (let i = this.size - 1; i > 0; i--) {
                this.state[i] = this.state[i - 1];
            }

            // Input the new bit at the beginning
            this.state[0] = this.dataIn.value || 0;
        }
        this.prevClockState = this.clock.value;

        // Update output - last bit of the register
        this.dataOut.value = this.state[this.size - 1];
        simulationArea.simulationQueue.add(this.dataOut);

        this.setOutputsUpstream(true);
    }

    /**
     * @memberof SISOShiftRegister
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
        rect2(
            ctx,
            -this.width / 2,
            -30,
            this.width,
            60,
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

        // Draw internal registers visualization
        const cellWidth = (this.width - 20) / this.size;

        for (let i = 0; i < this.size; i++) {
            // Draw cell rectangle
            ctx.beginPath();
            ctx.strokeStyle = colors["stroke"];
            ctx.lineWidth = correctWidth(1);
            const cellX = -this.width / 2 + 10 + i * cellWidth;
            rect2(ctx, cellX, -10, cellWidth - 4, 20, xx, yy, this.direction);
            ctx.stroke();

            // Draw bit value with different color based on value
            ctx.beginPath();
            ctx.font = "2px Raleway";
            ctx.fillStyle = this.state[i] ? "#3cae3c" : colors["input_text"];
            ctx.textAlign = "center";
            fillText(
                ctx,
                this.state[i].toString(),
                xx + cellX + (cellWidth - 4) / 2,
                yy + 5
            );

            // Draw arrows between cells except for the last one
            if (i < this.size - 1) {
                ctx.beginPath();
                ctx.strokeStyle = colors["stroke"];
                ctx.lineWidth = correctWidth(1);
                const arrowX = cellX + cellWidth - 2;
                moveTo(ctx, arrowX, 0, xx, yy, this.direction);
                lineTo(ctx, arrowX + 6, 0, xx, yy, this.direction);
                lineTo(ctx, arrowX + 3, -3, xx, yy, this.direction);
                moveTo(ctx, arrowX + 6, 0, xx, yy, this.direction);
                lineTo(ctx, arrowX + 3, 3, xx, yy, this.direction);
                ctx.stroke();
            }
        }
    }

    /**
     * @memberof SISOShiftRegister
     * function to change size of the shift register
     * @param {number} size - new size
     */
    changeSize(size) {
        if (size === undefined || size < 2 || size > 16) return;

        // Update size and state
        this.size = size;
        this.state = new Array(this.size).fill(0);

        // Recalculate width based on new size
        this.width = Math.max(80, this.size * 20);
        this.setDimensions(this.width / 2, 30);

        // Update position of nodes
        this.dataIn.x = -this.width / 2;
        this.clock.x = -this.width / 2;
        this.reset.x = -this.width / 2;
        this.dataOut.x = this.width / 2;
    }

    static moduleVerilog() {
        return `
module SISOShiftRegister(input clk, input reset, input data_in, output data_out);
  parameter SIZE = 4;
  reg [SIZE-1:0] state;
  
  always @(posedge clk or posedge reset) begin
    if (reset) begin
      state <= 0;
    end else begin
      state <= {state[SIZE-2:0], data_in};
    end
  end
  
  assign data_out = state[SIZE-1];
endmodule
`;
    }
}

/**
 * @memberof SISOShiftRegister
 * Help Tip
 * @type {string}
 * @category modules
 */
SISOShiftRegister.prototype.tooltipText =
    "Serial-In Serial-Out (SISO) Shift Register: Takes in data serially and outputs it serially after shifting through the register.";
SISOShiftRegister.prototype.helplink =
    "https://en.wikipedia.org/wiki/Shift_register";
SISOShiftRegister.prototype.objectType = "SISOShiftRegister";
SISOShiftRegister.prototype.mutableProperties = {
    size: {
        name: "Bit Size: ",
        type: "number",
        max: "16",
        min: "2",
        func: "changeSize",
    },
};

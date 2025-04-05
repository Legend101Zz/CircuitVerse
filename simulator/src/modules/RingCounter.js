/* eslint-disable no-param-reassign */
/* eslint-disable no-bitwise */
import CircuitElement from '../circuitElement';
import Node, { findNode } from '../node';
import simulationArea from '../simulationArea';
// eslint-disable-next-line object-curly-newline
import { lineTo, moveTo, fillText, correctWidth, rect2 } from '../canvasApi';
import { colors } from '../themer/themer';

/**
 * @class
 * RingCounter component.
 * @extends CircuitElement
 * @param {number} x - x coordinate of element.
 * @param {number} y - y coordinate of element.
 * @param {Scope=} scope - Cirucit on which element is drawn
 * @param {number=} bitWidth - number of bits (stages) in the ring counter
 * @category modules
 */
export default class RingCounter extends CircuitElement {
    constructor(x, y, scope = globalScope, bitWidth = 4) {
        super(x, y, scope, 'RIGHT', bitWidth);
        /* this is done in this.baseSetup() now
        this.scope['RingCounter'].push(this);
        */
        this.directionFixed = true;
        this.rectangleObject = true;

        this.setDimensions(20, 20);

        this.clock = new Node(-20, 0, 0, this, 1, 'Clock');
        this.reset = new Node(0, 20, 0, this, 1, 'Reset');
        this.output = new Node(20, 0, 1, this, this.bitWidth, 'Output');

        // Initialize with a single 1 in the first position
        this.value = 1; // Start with 1000...
        this.prevClockState = undefined;
    }

    customSave() {
        return {
            nodes: {
                clock: findNode(this.clock),
                reset: findNode(this.reset),
                output: findNode(this.output),
            },
            constructorParamaters: [this.bitWidth],
        };
    }

    newBitWidth(bitWidth) {
        if (bitWidth < 2) bitWidth = 2; // Ring counter needs at least 2 bits
        this.bitWidth = bitWidth;
        this.output.bitWidth = bitWidth;
        // Ensure value is valid for new bitWidth (a single 1 in a valid position)
        this.value = 1; // Reset to first position
    }

    // eslint-disable-next-line class-methods-use-this
    isResolvable() {
        return true;
    }

    resolve() {
        // Check if clock state has changed to rising edge
        if (this.clock.value !== this.prevClockState && this.clock.value === 1) {
            // Perform circular shift
            this.value = ((this.value << 1) | (this.value >> (this.bitWidth - 1)))
                & ((1 << this.bitWidth) - 1);
        }
        this.prevClockState = this.clock.value;

        // Reset to initial state (1000...) if reset is high
        if (this.reset.value === 1) {
            this.value = 1; // First bit set to 1
        }

        // Update output
        if (this.output.value !== this.value) {
            this.output.value = this.value;
            simulationArea.simulationQueue.add(this.output);
        }

        this.setOutputsUpstream(true);
    }

    customDraw() {
        var ctx = simulationArea.context;
        var xx = this.x;
        var yy = this.y;

        ctx.beginPath();
        ctx.font = '20px Raleway';
        ctx.fillStyle = colors.input_text;
        ctx.textAlign = 'center';

        // Display current value in binary
        const binValue = this.value.toString(2).padStart(this.bitWidth, '0');
        fillText(ctx, binValue, this.x, this.y + 5);
        ctx.fill();

        // Draw clock input symbol (triangle)
        ctx.strokeStyle = colors.stroke;
        ctx.beginPath();
        moveTo(ctx, -20, -5, xx, yy, this.direction);
        lineTo(ctx, -15, 0, xx, yy, this.direction);
        lineTo(ctx, -20, 5, xx, yy, this.direction);
        ctx.stroke();
    }

    // Draws the element in the subcircuit. Used in layout mode
    subcircuitDraw(xOffset = 0, yOffset = 0) {
        var ctx = simulationArea.context;
        var xx = this.subcircuitMetadata.x + xOffset;
        var yy = this.subcircuitMetadata.y + yOffset;

        ctx.beginPath();
        ctx.font = '20px Raleway';
        ctx.fillStyle = 'green';
        ctx.textAlign = 'center';

        // Display current value in binary
        const binValue = this.value.toString(2).padStart(this.bitWidth, '0');
        fillText(ctx, binValue, xx + 10, yy + 17);
        ctx.fill();

        ctx.beginPath();
        ctx.lineWidth = correctWidth(1);
        rect2(ctx, 0, 0, 20, 20, xx, yy, this.direction);
        ctx.stroke();

        if (
            (this.hover && !simulationArea.shiftDown)
            || simulationArea.lastSelected === this
            || simulationArea.multipleObjectSelections.contains(this)
        ) {
            ctx.fillStyle = 'rgba(255, 255, 32,0.6)';
            ctx.fill();
        }
    }

    static moduleVerilog() {
        return `
    module RingCounter(output, clk, rst);
      parameter WIDTH = 4;
      output reg [WIDTH-1:0] output;
      input clk, rst;
    
      initial
        output = 1; // Initialize with first bit set
    
      always @ (posedge clk or posedge rst) begin
        if (rst)
          output <= 1; // Reset to initial state
        else
          output <= {output[WIDTH-2:0], output[WIDTH-1]}; // Circular shift
      end
    endmodule`;
    }
}

RingCounter.prototype.tooltipText = 'Ring Counter: A circular shift register that rotates a single bit';
RingCounter.prototype.helplink = 'https://docs.circuitverse.org/#/chapter4/2input?id=ringcounter';
RingCounter.prototype.objectType = 'RingCounter';
RingCounter.prototype.canShowInSubcircuit = true;
RingCounter.prototype.layoutProperties = {
    rightDimensionX: 20,
    leftDimensionX: 0,
    upDimensionY: 0,
    downDimensionY: 20,
};

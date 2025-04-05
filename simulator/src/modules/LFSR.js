import CircuitElement from "../circuitElement";
import Node, { findNode } from "../node";
import simulationArea from "../simulationArea";
import { lineTo, moveTo, fillText, correctWidth, rect2 } from "../canvasApi";
import { colors } from "../themer/themer";

/**
 * @class
 * Linear Feedback Shift Register (LFSR) component.
 * @extends CircuitElement
 * @param {number} x - x coordinate of element.
 * @param {number} y - y coordinate of element.
 * @param {Scope=} scope - Circuit on which element is drawn
 * @param {number=} bitWidth - number of bits in the LFSR
 * @category modules
 */
export default class LFSR extends CircuitElement {
    constructor(x, y, scope = globalScope, bitWidth = 4) {
        super(x, y, scope, "RIGHT", bitWidth);
        this.directionFixed = true;
        this.rectangleObject = true;

        this.setDimensions(30, 20);

        // Create the nodes
        this.clock = new Node(-30, -10, 0, this, 1, "Clock");
        this.reset = new Node(-30, 10, 0, this, 1, "Reset");
        this.seed = new Node(0, -20, 0, this, this.bitWidth, "Seed");
        this.load = new Node(-10, -20, 0, this, 1, "Load");
        this.output = new Node(30, 0, 1, this, this.bitWidth, "Output");

        // Set minimum bit width to 2
        if (this.bitWidth < 2) this.bitWidth = 2;

        // Set up the taps for different bit widths
        this.taps = this.getTapsForBitWidth(this.bitWidth);

        // Initialize value with a non-zero pattern
        this.value = 1; // Default seed
        this.prevClockState = undefined;
    }

    /**
     * Get optimal LFSR taps for maximum period
     * These are based on maximal-length LFSR configurations
     */
    getTapsForBitWidth(bitWidth) {
        const tapTable = {
            2: [1, 0], // x^2 + x + 1
            3: [2, 1], // x^3 + x^2 + 1
            4: [3, 2], // x^4 + x^3 + 1
            5: [4, 2], // x^5 + x^3 + 1
            6: [5, 4], // x^6 + x^5 + 1
            7: [6, 5], // x^7 + x^6 + 1
            8: [7, 5, 4, 3], // x^8 + x^6 + x^5 + x^4 + 1
            9: [8, 4], // x^9 + x^5 + 1
            10: [9, 6], // x^10 + x^7 + 1
            11: [10, 8], // x^11 + x^9 + 1
            12: [11, 10, 9, 3], // x^12 + x^11 + x^10 + x^4 + 1
            13: [12, 11, 10, 7], // x^13 + x^12 + x^11 + x^8 + 1
            14: [13, 12, 11, 1], // x^14 + x^13 + x^12 + x^2 + 1
            15: [14, 13], // x^15 + x^14 + 1
            16: [15, 14, 12, 3], // x^16 + x^15 + x^13 + x^4 + 1
        };

        // Default to a simple tap if not in the table
        return tapTable[bitWidth] || [bitWidth - 1, Math.floor(bitWidth / 2)];
    }

    customSave() {
        return {
            nodes: {
                clock: findNode(this.clock),
                reset: findNode(this.reset),
                seed: findNode(this.seed),
                load: findNode(this.load),
                output: findNode(this.output),
            },
            constructorParamaters: [this.bitWidth],
        };
    }

    newBitWidth(bitWidth) {
        if (bitWidth < 2) bitWidth = 2; // LFSR needs at least 2 bits
        this.bitWidth = bitWidth;
        this.seed.bitWidth = bitWidth;
        this.output.bitWidth = bitWidth;
        this.taps = this.getTapsForBitWidth(bitWidth);
        this.value = 1; // Reset to default value
    }

    isResolvable() {
        return true;
    }

    resolve() {
        // Check if load is active (load the seed value)
        if (this.load.value == 1 && this.seed.value !== undefined) {
            // Ensure the seed is non-zero (LFSR will get stuck in a loop if seed is zero)
            this.value = this.seed.value || 1;
        }
        // Check if clock state has changed to rising edge
        else if (
            this.clock.value != this.prevClockState &&
            this.clock.value == 1
        ) {
            // Calculate feedback bit using XOR of tapped bits
            let feedback = 0;
            for (let tap of this.taps) {
                feedback ^= (this.value >> tap) & 1;
            }

            // Shift the value and add feedback bit to MSB
            this.value =
                ((this.value >> 1) | (feedback << (this.bitWidth - 1))) &
                ((1 << this.bitWidth) - 1);
        }
        this.prevClockState = this.clock.value;

        // Reset to non-zero value if reset is high
        if (this.reset.value == 1) {
            this.value = 1; // Set to default value
        }

        // Update output
        if (this.output.value != this.value) {
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
        ctx.font = "12px Raleway";
        ctx.fillStyle = colors["input_text"];
        ctx.textAlign = "center";

        // Display current value in binary and hex
        let binValue = this.value.toString(2).padStart(this.bitWidth, "0");
        let hexValue = this.value.toString(16).toUpperCase();
        fillText(ctx, `${binValue} (0x${hexValue})`, this.x, this.y + 5);
        ctx.fill();

        // Draw LFSR label
        ctx.font = "10px Raleway";
        fillText(ctx, "LFSR", this.x, this.y - 10);

        // Draw clock input symbol (triangle)
        ctx.strokeStyle = colors["stroke"];
        ctx.beginPath();
        moveTo(ctx, -30, -15, xx, yy, this.direction);
        lineTo(ctx, -25, -10, xx, yy, this.direction);
        lineTo(ctx, -30, -5, xx, yy, this.direction);
        ctx.stroke();
    }

    // Draws the element in the subcircuit. Used in layout mode
    subcircuitDraw(xOffset = 0, yOffset = 0) {
        var ctx = simulationArea.context;
        var xx = this.subcircuitMetadata.x + xOffset;
        var yy = this.subcircuitMetadata.y + yOffset;

        ctx.beginPath();
        ctx.font = "12px Raleway";
        ctx.fillStyle = "green";
        ctx.textAlign = "center";

        // Display current value in hex
        let hexValue = this.value.toString(16).toUpperCase();
        fillText(ctx, `LFSR:${hexValue}`, xx + 15, yy + 12);
        ctx.fill();

        ctx.beginPath();
        ctx.lineWidth = correctWidth(1);
        rect2(ctx, 0, 0, 30, 20, xx, yy, this.direction);
        ctx.stroke();

        if (
            (this.hover && !simulationArea.shiftDown) ||
            simulationArea.lastSelected == this ||
            simulationArea.multipleObjectSelections.contains(this)
        ) {
            ctx.fillStyle = "rgba(255, 255, 32,0.6)";
            ctx.fill();
        }
    }

    static moduleVerilog() {
        return `
    module LFSR(output, seed, load, clk, rst);
      parameter WIDTH = 4;
      output reg [WIDTH-1:0] output;
      input [WIDTH-1:0] seed;
      input load, clk, rst;
      
      reg [WIDTH-1:0] taps;
      reg feedback;
      integer i;
      
      // Set up taps based on WIDTH
      always @(*) begin
        case(WIDTH)
          2: taps = 2'b11;        // x^2 + x + 1
          3: taps = 3'b110;       // x^3 + x^2 + 1
          4: taps = 4'b1100;      // x^4 + x^3 + 1
          5: taps = 5'b10100;     // x^5 + x^3 + 1
          6: taps = 6'b110000;    // x^6 + x^5 + 1
          7: taps = 7'b1100000;   // x^7 + x^6 + 1
          8: taps = 8'b10111000;  // x^8 + x^6 + x^5 + x^4 + 1
          9: taps = 9'b100010000; // x^9 + x^5 + 1
          10: taps = 10'b1001000000; // x^10 + x^7 + 1
          default: taps = {1'b1, {(WIDTH-2){1'b0}}, 1'b1}; // Default feedback
        endcase
      end
    
      always @(posedge clk or posedge rst) begin
        if (rst)
          output <= 1; // Reset to non-zero value
        else if (load)
          output <= (seed == 0) ? 1 : seed; // Load seed, ensure non-zero
        else begin
          // Calculate feedback using XOR of tapped bits
          feedback = 0;
          for (i = 0; i < WIDTH; i = i + 1)
            if (taps[i])
              feedback = feedback ^ output[i];
          
          // Shift and set feedback
          output <= {feedback, output[WIDTH-1:1]};
        end
      end
    endmodule`;
    }
}

LFSR.prototype.tooltipText =
    "Linear Feedback Shift Register (LFSR): Generates pseudo-random sequences based on linear feedback";
LFSR.prototype.helplink =
    "https://docs.circuitverse.org/#/chapter4/2input?id=lfsr";
LFSR.prototype.objectType = "LFSR";
LFSR.prototype.canShowInSubcircuit = true;
LFSR.prototype.layoutProperties = {
    rightDimensionX: 30,
    leftDimensionX: 30,
    upDimensionY: 20,
    downDimensionY: 20,
};

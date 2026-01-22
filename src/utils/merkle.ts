
import { keccak256, encodePacked } from 'viem';

/**
 * Standard Merkle Tree implementation for Batch ZK.
 * Supports generating roots and proofs (paths) for a fixed-size tree.
 */
export class MerkleTree {
    leaves: string[];
    layers: string[][];

    constructor(leaves: string[]) {
        this.leaves = leaves;
        this.layers = [];
        this.buildTree();
    }

    private buildTree() {
        let currentLayer = this.leaves.map(leaf => leaf); // Copy
        this.layers.push(currentLayer);

        while (currentLayer.length > 1) {
            const nextLayer: string[] = [];
            for (let i = 0; i < currentLayer.length; i += 2) {
                const left = currentLayer[i];
                const right = (i + 1 < currentLayer.length) ? currentLayer[i + 1] : left; // Duplicate last if odd (though we target 256 fixed)
                nextLayer.push(this.hashPair(left, right));
            }
            currentLayer = nextLayer;
            this.layers.push(currentLayer);
        }
    }

    private hashPair(left: string, right: string): string {
        // Keccak256 hash of concatenated child hashes
        // Note: Sort pair? Standard keeps order.
        return keccak256(encodePacked(['bytes32', 'bytes32'], [left as `0x${string}`, right as `0x${string}`]));
    }

    getRoot(): string {
        return this.layers[this.layers.length - 1][0];
    }

    getProof(index: number): string[] {
        const proof: string[] = [];
        let currentIndex = index;

        for (let i = 0; i < this.layers.length - 1; i++) {
            const layer = this.layers[i];
            const isRightNode = currentIndex % 2 === 1;
            const pairIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

            if (pairIndex < layer.length) {
                proof.push(layer[pairIndex]);
            } else {
                // Should not happen in 256-fixed tree, but if it does, duplicate self
                proof.push(layer[currentIndex]);
            }
            currentIndex = Math.floor(currentIndex / 2);
        }
        return proof;
    }
}

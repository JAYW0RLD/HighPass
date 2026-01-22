declare module 'snarkjs' {
    export const groth16: {
        fullProve(input: any, wasmFile: string, zkeyFile: string): Promise<{ proof: any; publicSignals: any }>;
        verify(vKey: any, publicSignals: any, proof: any): Promise<boolean>;
        setup(r1csFile: string, ptauFile: string, zkeyFile: string): Promise<any>;
    };
    export const powersoftau: any;
    export const zkey: any;
}

import { useState } from 'react';
import { CheckIcon } from './Icons';

interface CodeBlockProps {
    code: string;
    language?: string;
}

export default function CodeBlock({ code }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group">
            <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                <pre className="text-sm text-slate-100 font-mono leading-relaxed">
                    <code>{code}</code>
                </pre>
            </div>

            {/* Copy Button */}
            <button
                onClick={handleCopy}
                className="absolute top-3 right-3 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1.5"
            >
                {copied ? (
                    <>
                        <CheckIcon className="w-3 h-3" />
                        Copied!
                    </>
                ) : (
                    <>
                        📋 Copy
                    </>
                )}
            </button>
        </div>
    );
}

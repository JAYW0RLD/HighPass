import { Toaster } from 'react-hot-toast';

/**
 * Toast Provider Component
 * Provides app-wide toast notifications with custom styling
 * matching GitHub + YouTube + Bybit design system
 */
export const ToastProvider = () => (
    <Toaster
        position="top-right"
        toastOptions={{
            duration: 4000,
            style: {
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: 'var(--shadow-md)',
            },
            success: {
                iconTheme: {
                    primary: 'var(--accent-green)',
                    secondary: '#fff',
                },
                style: {
                    borderLeft: '3px solid var(--accent-green)',
                },
            },
            error: {
                iconTheme: {
                    primary: 'var(--accent-red)',
                    secondary: '#fff',
                },
                style: {
                    borderLeft: '3px solid var(--accent-red)',
                },
            },
            loading: {
                iconTheme: {
                    primary: 'var(--accent-blue)',
                    secondary: '#fff',
                },
            },
        }}
    />
);

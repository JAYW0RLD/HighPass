import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
    showDemoData: boolean;
    setShowDemoData: (value: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [showDemoData, setShowDemoData] = useState<boolean>(() => {
        const saved = localStorage.getItem('highstation_show_demo_data');
        return saved !== null ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        localStorage.setItem('highstation_show_demo_data', JSON.stringify(showDemoData));
    }, [showDemoData]);

    return (
        <SettingsContext.Provider value={{ showDemoData, setShowDemoData }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

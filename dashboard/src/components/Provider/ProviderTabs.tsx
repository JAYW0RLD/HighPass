import type { ProviderTab } from '../../types';

interface ProviderTabsProps {
    activeTab: ProviderTab;
    onTabChange: (tab: ProviderTab) => void;
}

export const ProviderTabs = ({ activeTab, onTabChange }: ProviderTabsProps) => {
    const tabs: { id: ProviderTab; label: string }[] = [
        { id: 'services', label: 'Services' },
        { id: 'integration', label: 'Integration' },
        { id: 'revenue', label: 'Revenue' }
    ];

    return (
        <div className="flex items-center gap-3 mb-10 border-b border-white/5 pb-6">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`chip ${activeTab === tab.id ? 'active' : ''}`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

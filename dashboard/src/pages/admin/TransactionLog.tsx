import { useServices } from '../../hooks/useServices';
import ServiceAnalyticsSection from '../../components/ServiceAnalyticsSection';

export default function TransactionLog() {
    const { services } = useServices();

    return (
        <div className="animate-fade-in">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Transaction Logs</h1>
                <p className="text-slate-500 mt-2 text-lg">Monitor detailed activities and aggregated performance metrics across your services.</p>
            </div>

            {/* Service Analytics Section */}
            <ServiceAnalyticsSection services={services} />
        </div>
    );
}

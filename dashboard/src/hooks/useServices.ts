import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { authenticatedFetch } from '../utils/apiClient';
import { DEMO_SERVICE_DEFAULTS } from '../config';
import type { Service } from '../types';

export function useServices() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchServices = useCallback(async () => {
        try {
            // [Hybrid Architecture]
            // Always fetch from Backend API (which queries Local Postgres).
            // Direct Supabase query (Legacy) is removed.

            const res = await authenticatedFetch('/api/provider/services');
            if (!res.ok) throw new Error('Failed to fetch services from backend');
            const data = await res.json();
            setServices(data || []);

            setLoading(false);
        } catch (err: unknown) {
            console.error('Error fetching services:', err);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const handleCreateService = async (newService: any) => {
        try {
            // Mapping for compatibility if UI sends old structure
            const payload = {
                ...newService,
                access_requirements: newService.access_requirements || {
                    min_grade: newService.min_grade || 'F',
                    requires_openseal: !!newService.openseal_repo_url,
                    requires_zk_proof: false
                },
                // Metadata Integration
                category: newService.category || 'General',
                tags: newService.tags || [],
                description: newService.description || '',
                capabilities: newService.capabilities || {}
            };
            // Remove legacy fields from top-level before sending
            delete (payload as any).min_grade;

            // 1. Create Base Service
            const res = await authenticatedFetch(`/api/services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to create service');
            }



            // 2. OpenSeal Verification (Handled automatically by Backend in Step 1)
            if (newService.openseal_repo_url) {
                // If the backend processed it successfully, data will contain the hash.
                // We can assume success if the creation didn't throw.
                toast('Service created & OpenSeal verification attempted.', { icon: '🚀' });
            } else {
                toast.success('Service created successfully!');
            }

            fetchServices();
            return true;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(`Failed to create service: ${message}`);
            return false;
        }
    };

    const handleUpdateService = async (updatedService: Service) => {
        try {
            const res = await authenticatedFetch(`/api/services/${updatedService.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: updatedService.name,
                    slug: updatedService.slug,
                    upstream_url: updatedService.upstream_url,
                    price_wei: updatedService.price_wei,
                    access_requirements: updatedService.access_requirements || { min_grade: 'F', requires_openseal: false },
                    trust_seed_enabled: updatedService.trust_seed_enabled,
                    // Metadata Updates
                    category: updatedService.category,
                    tags: updatedService.tags,
                    description: updatedService.description,
                    capabilities: updatedService.capabilities
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to update service');
            }

            toast.success('Service updated successfully!');
            fetchServices();
            return true;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(`Failed to update service: ${message}`);
            return false;
        }
    };

    const handleDeleteServiceFromApi = async (serviceId: string) => {
        try {
            const res = await authenticatedFetch(`/api/services/${serviceId}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to delete service');
            }

            toast.success('Service deleted');
            fetchServices();
            return true;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(`Failed to delete service: ${message}`);
            return false;
        }
    };

    const deployDemoService = async (overrides?: { name?: string; slug?: string; upstream_url?: string }) => {
        setLoading(true);
        try {
            // 1. Create Base Service
            const res = await authenticatedFetch(`/api/services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: overrides?.name || DEMO_SERVICE_DEFAULTS.NAME,
                    slug: overrides?.slug || 'text-washer',
                    upstream_url: overrides?.upstream_url || DEMO_SERVICE_DEFAULTS.UPSTREAM_URL_DEFAULT,
                    price_wei: DEMO_SERVICE_DEFAULTS.PRICE_WEI,
                    access_requirements: {
                        min_grade: DEMO_SERVICE_DEFAULTS.MIN_GRADE || 'F',
                        requires_openseal: !!DEMO_SERVICE_DEFAULTS.OPENSEAL_REPO
                    },
                    openseal_repo_url: DEMO_SERVICE_DEFAULTS.OPENSEAL_REPO,
                    // Demo Metadata
                    category: 'AI',
                    tags: ['demo', 'text-processing', 'privacy'],
                    description: 'Real-world AI service demo: A high-integrity text sanitization API protected by OpenSeal and x402.'
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error('Demo creation failed:', errText);
                throw new Error('Failed to create demo service');
            }

            await res.json();

            // 2. OpenSeal Verification is handled in Step 1
            toast('Demo Service Deployed & Verified via OpenSeal!', { icon: '🚀' });

            fetchServices();
            setLoading(false);
            return true;
        } catch (err: unknown) {
            console.error(err);
            toast.error('Failed to deploy demo service');
            setLoading(false);
            return false;
        }
    };

    const testConnection = async (url: string, testPath?: string) => {
        try {
            const res = await authenticatedFetch('/api/services/utils/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, testPath })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Connection failed');
            }
            return await res.json();
        } catch (err: any) {
            throw err;
        }
    };

    const verifyOpenSealRepo = async (repoUrl: string) => {
        try {
            const res = await authenticatedFetch('/api/services/utils/verify-repo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repo_url: repoUrl })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Repo verification failed');
            }
            return await res.json();
        } catch (err: any) {
            throw err;
        }
    };

    const generateToken = async (id: string) => {
        try {
            const res = await authenticatedFetch(`/api/services/${id}/generate-token`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error('Failed to generate token');
            return await res.json();
        } catch (err: any) {
            throw err;
        }
    };

    const verifyOwnership = async (id: string) => {
        try {
            const res = await authenticatedFetch(`/api/services/${id}/verify`, {
                method: 'POST'
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || data.error || 'Verification failed');
            }
            await res.json();
        } catch (err: any) {
            throw err;
        }
    };

    const verifyDns = async (id: string) => {
        try {
            const res = await authenticatedFetch(`/api/services/${id}/verify-dns`, {
                method: 'POST'
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || data.error || 'DNS Verification failed');
            }
            await res.json();
        } catch (err: any) {
            throw err;
        }
    };

    return {
        services,
        loading,
        fetchServices,
        handleCreateService,
        handleUpdateService,
        handleDeleteServiceFromApi,
        deployDemoService,
        testConnection,
        verifyOpenSealRepo,
        generateToken,
        verifyOwnership,
        verifyDns
    };
}

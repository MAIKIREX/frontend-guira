"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Copy, Loader2, ShieldAlert, Wallet } from "lucide-react";
import { WalletsDonutChart } from '@/features/wallet/components/wallets-donut-chart';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useProfileStore } from "@/stores/profile-store";
import { WalletService, type WalletBalance } from "@/services/wallet.service";
import { createClient } from "@/lib/supabase/browser";
import { VirtualAccountsSection } from "./virtual-accounts-section";

const NETWORK_LABELS: Record<string, string> = {
    ethereum: "Ethereum Mainnet",
    polygon: "Polygon",
    stellar: "Stellar Network",
    solana: "Solana Network",
    tron: "TRON",
    avalanche: "Avalanche",
    base: "Base",
};

const NETWORK_BADGE_LABELS: Record<string, string> = {
    ethereum: "ERC-20",
    polygon: "ERC-20",
    stellar: "STELLAR",
    solana: "SPL TOKEN",
    tron: "TRC-20",
    avalanche: "C-CHAIN",
    base: "BASE",
};

function truncateAddress(address: string, chars = 4): string {
    if (!address || address.length <= chars * 2) return address;
    return `${address.slice(0, chars + 2)}. . .${address.slice(-chars)}`;
}

/** Labels para los tokens / stablecoins */
const TOKEN_LABELS: Record<string, string> = {
    USDC: "USD Coin",
    USDT: "Tether",
    USDB: "Bridge USD",
    PYUSD: "PayPal USD",
    EURC: "Euro Coin",
    UERC: "UERC Token",
    USD: "Dólar (fiat)",
};

/** Las 5 monedas a mostrar siempre */
const DISPLAY_CURRENCIES = ["USDC", "USDT", "USDB", "PYUSD", "UERC"] as const;

// ── Token Row (with Icons & Animation) ─────────────────────────

const TOKEN_ICONS: Record<string, string> = {
    USDC: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/usdc.svg",
    USDT: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/usdt.svg",
    USDB: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/usd.svg",
    PYUSD: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/usd.svg",
    UERC: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/generic.svg",
};

// Brand accent colors per token for the subtle glow ring
const TOKEN_ACCENTS: Record<string, string> = {
    USDC: "ring-blue-400/20 shadow-blue-500/10",
    USDT: "ring-emerald-400/20 shadow-emerald-500/10",
    USDB: "ring-sky-400/20 shadow-sky-500/10",
    PYUSD: "ring-blue-300/20 shadow-blue-400/10",
    UERC: "ring-violet-400/20 shadow-violet-500/10",
};

const SPRING = { type: 'spring' as const, stiffness: 100, damping: 20 };

function TokenRow({
    currency,
    balance,
    index,
}: {
    currency: string;
    balance: number;
    index: number;
}) {
    const tokenLabel = TOKEN_LABELS[currency] ?? currency;
    const iconUrl = TOKEN_ICONS[currency] ?? TOKEN_ICONS["USDB"];
    const accentClasses = TOKEN_ACCENTS[currency] ?? "ring-border/30";

    return (
        <motion.div
            className="group"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...SPRING, delay: index * 0.08 }}
        >
            <div className="flex items-center justify-between gap-4 py-4 px-4 -mx-4 rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted/30 hover:translate-x-1 cursor-pointer">
                <div className="flex items-center gap-4 min-w-0">
                    <div className={cn(
                        "relative flex size-12 shrink-0 items-center justify-center rounded-full overflow-hidden bg-background border border-border/40 ring-2 shadow-lg transition-all duration-300 group-hover:ring-4",
                        accentClasses,
                    )}>
                        <img
                            src={iconUrl}
                            alt={currency}
                            className="size-[60%] object-contain"
                            onError={(e) => {
                                e.currentTarget.style.display = "none";
                                if (e.currentTarget.nextElementSibling) {
                                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
                                }
                            }}
                        />
                        <div className="hidden absolute inset-0 size-full items-center justify-center bg-primary/10">
                            <span className="text-primary font-bold text-xs">
                                {currency.slice(0, 1)}
                            </span>
                        </div>
                    </div>
                    <div className="min-w-0 flex flex-col justify-center">
                        <span className="text-sm font-bold text-foreground leading-tight tracking-tight">
                            {tokenLabel}
                        </span>
                        <span className="text-[11px] text-muted-foreground/60 mt-0.5 font-semibold tracking-wide uppercase">
                            {currency}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col items-end justify-center shrink-0">
                    <span
                        className={cn(
                            "text-base font-bold tracking-tight tabular-nums",
                            balance > 0 ? "text-foreground" : "text-muted-foreground/40"
                        )}
                    >
                        {balance > 0 ? "$" : ""}
                        {balance.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </span>
                    {balance > 0 && (
                        <span className="text-[9px] text-success font-bold uppercase tracking-[0.15em] mt-0.5">
                            Disponible
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ── Wallets Section (extracted) ──────────────────────────────────

function WalletsSection({ isApproved }: { isApproved: boolean }) {
    const [wallets, setWallets] = useState<WalletBalance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await WalletService.getWallets();
            setWallets(data ?? []);
        } catch (err) {
            setError(
                (err as Error)?.message ?? "No se pudieron cargar las cuentas",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    // ── Supabase Realtime: auto-refresh when balance changes ──
    const { profile } = useProfileStore();
    const channelRef = useRef<ReturnType<
        ReturnType<typeof createClient>["channel"]
    > | null>(null);

    useEffect(() => {
        const userId = profile?.id;
        if (!userId) return;

        const supabase = createClient();
        const channel = supabase
            .channel(`wallets-live:${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "balances",
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    void load();
                },
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [profile?.id, load]);

    // Compute aggregated token balances across all wallets for the 5 display currencies
    const aggregatedTokens: Record<string, number> = {};
    DISPLAY_CURRENCIES.forEach((cur) => {
        aggregatedTokens[cur] = 0;
    });

    wallets.forEach((wallet) => {
        if (wallet.token_balances) {
            wallet.token_balances.forEach((token) => {
                if (token.currency in aggregatedTokens) {
                    aggregatedTokens[token.currency] +=
                        token.available_balance ?? 0;
                }
            });
        }
    });

    // Wallet info (from first wallet)
    const primaryWallet = wallets[0];
    const walletAddress = primaryWallet?.address ?? null;
    const walletId = primaryWallet?.id ?? null;
    const walletNetwork = primaryWallet?.network
        ? (NETWORK_LABELS[primaryWallet.network] ?? primaryWallet.network)
        : null;
    const networkBadge = primaryWallet?.network
        ? (NETWORK_BADGE_LABELS[primaryWallet.network] ?? "TOKEN")
        : null;

    return (
        <div className="space-y-0">
            {/* Loading */}
            {loading && (
                <div className="flex min-h-[20vh] items-center justify-center">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <Card className="border-destructive/30">
                    <CardHeader>
                        <CardTitle className="text-base">
                            Error al cargar cuentas
                        </CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void load()}
                        >
                            Reintentar
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Empty */}
            {!loading && !error && wallets.length === 0 && (
                <div className="flex min-h-[24vh] flex-col items-center justify-center gap-5 text-center py-12">
                    <div className="relative flex size-16 items-center justify-center rounded-full border border-border/40 bg-muted/20 ring-4 ring-muted/30">
                        <Wallet className="size-6 text-muted-foreground/40" />
                    </div>
                    <div className="max-w-sm">
                        <p className="text-lg font-semibold tracking-tight text-foreground">
                            No hay wallets activas
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground/70 leading-relaxed">
                            {isApproved
                                ? "Tus wallets se están aprovisionando en nuestra infraestructura blockchain de alta seguridad. Aparecerán aquí en unos instantes."
                                : "Para mantener la seguridad de nuestra plataforma, completa tu verificación KYC/KYB para habilitar tus bóvedas y billeteras."}
                        </p>
                    </div>
                </div>
            )}

            {/* Token Rows + Donut Chart */}
            {!loading && !error && wallets.length > 0 && (
                <div className="pt-2">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6 items-start">
                        {/* Left: Token List */}
                        <div>
                            {DISPLAY_CURRENCIES.filter((cur) => cur !== "USDB" && cur !== "PYUSD").map((cur, index) => (
                                <TokenRow
                                    key={cur}
                                    currency={cur}
                                    balance={aggregatedTokens[cur]}
                                    index={index}
                                />
                            ))}
                        </div>

                        {/* Right: Donut Chart */}
                        <div className="flex items-center justify-center">
                            <WalletsDonutChart aggregatedTokens={aggregatedTokens} />
                        </div>
                    </div>

                    {/* ── Wallet Infrastructure Strip ── */}
                    <div className="mt-6 pt-5 border-t border-border/30">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Network */}
                            {walletNetwork && (
                                <div className="flex items-center gap-2 rounded-full bg-muted/30 border border-border/30 px-3 py-1.5">
                                    <Badge
                                        variant="outline"
                                        className="rounded-sm px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider border-primary/20 bg-primary/5 text-primary"
                                    >
                                        {networkBadge}
                                    </Badge>
                                    <span className="text-[11px] font-semibold text-foreground">
                                        {walletNetwork}
                                    </span>
                                </div>
                            )}

                            {/* Wallet Address */}
                            {walletAddress && (
                                <div className="flex items-center gap-2 rounded-full bg-muted/30 border border-border/30 px-3 py-1.5">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                                        Wallet
                                    </span>
                                    <span className="font-mono text-[11px] text-foreground/80 tabular-nums">
                                        {truncateAddress(walletAddress, 6)}
                                    </span>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText(
                                                    walletAddress,
                                                );
                                            } catch {
                                                /* noop */
                                            }
                                        }}
                                        className="text-muted-foreground/30 hover:text-foreground transition-colors"
                                        title="Copiar dirección"
                                    >
                                        <Copy className="size-3" />
                                    </button>
                                </div>
                            )}

                            {/* Account Number */}
                            {walletId && (
                                <div className="flex items-center gap-2 rounded-full bg-muted/30 border border-border/30 px-3 py-1.5">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                                        Cuenta
                                    </span>
                                    <span className="font-mono text-[11px] text-foreground/80 tabular-nums">
                                        {walletId.slice(0, 8).toUpperCase()}
                                        ...
                                        {walletId.slice(-4).toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <p className="text-center text-[10px] text-muted-foreground/40 pt-6 leading-relaxed">
                        Wallets administradas por Bridge, respaldadas por activos digitales reales.
                        Balances actualizados en tiempo real.
                    </p>
                </div>
            )}
        </div>
    );
}

// ── Main Page ────────────────────────────────────────────────────

export function MyAccountsPage({ embedded = false }: { embedded?: boolean }) {
    const { profile } = useProfileStore();
    const isApproved = profile?.onboarding_status === "approved";

    /* ── Embedded mode: inline sections inside the Panel ── */
    if (embedded) {
        return (
            <div className="space-y-14">
                {/* KYC alert (only when not verified) */}
                {!isApproved && (
                    <motion.div
                        className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={SPRING}
                    >
                        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-400" />
                        <div>
                            <p className="font-semibold text-foreground">
                                Verificación pendiente
                            </p>
                            <p className="mt-0.5 text-muted-foreground/70">
                                Las wallets y cuentas virtuales se activan al
                                aprobar tu verificación KYC/KYB.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* ── Wallets Section ── */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...SPRING, delay: 0.1 }}
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-4xl font-extrabold text-foreground tracking-tight">Wallets</h2>
                            <p className="text-sm text-muted-foreground/60 mt-1.5 font-medium">
                                Tus balances de activos digitales en tiempo real
                            </p>
                        </div>
                        <div className="flex items-center gap-2 rounded-full bg-primary/5 border border-primary/10 px-3 py-1.5">
                            <Wallet className="size-3.5 text-primary/60" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Blockchain</span>
                        </div>
                    </div>
                    <WalletsSection isApproved={isApproved} />
                </motion.section>

                {/* ── Divider ── */}
                <div className="border-t border-border/30" />

                {/* ── Virtual Accounts Section ── */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...SPRING, delay: 0.2 }}
                >
                    <VirtualAccountsSection isApproved={isApproved} />
                </motion.section>
            </div>
        );
    }

    /* ── Standalone mode: full page with tabs (used by /cuentas route) ── */
    return (
        <div className="mx-auto w-full max-w-5xl space-y-6">
            {/* Header */}
            <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[oklch(0.58_0.10_210)]">
                    Mis Cuentas
                </p>
                <h1 className="mt-1.5 text-4xl sm:text-[3rem] sm:leading-[1.1] font-extrabold tracking-tight text-foreground">
                    Wallets y Cuentas Virtuales
                </h1>
            </div>

            {/* Alerta si no está verificado */}
            {!isApproved && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-400" />
                    <div>
                        <p className="font-medium text-foreground">
                            Verificación pendiente
                        </p>
                        <p className="mt-0.5 text-muted-foreground">
                            Las wallets y cuentas virtuales se activan al
                            aprobar tu verificación KYC/KYB. Completa el proceso
                            de onboarding para activar tu cuenta.
                        </p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="wallets" className="gap-0">
                <TabsList className="mb-0 flex w-full justify-start gap-8 bg-transparent p-0 border-b border-border rounded-none">
                    <TabsTrigger
                        value="wallets"
                        className="group relative flex-none rounded-none border-0 bg-transparent px-0 pb-3 pt-1 text-2xl font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground data-active:text-primary data-active:font-semibold data-active:shadow-none data-active:bg-transparent overflow-hidden cursor-pointer"
                    >
                        Wallets
                        <span className="absolute bottom-0 left-0 h-[2px] w-full bg-primary origin-left scale-x-0 transition-transform duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-x-100 group-data-active:scale-x-100" />
                    </TabsTrigger>

                    <TabsTrigger
                        value="virtual-accounts"
                        className="group relative flex-none rounded-none border-0 bg-transparent px-0 pb-3 pt-1 text-2xl font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground data-active:text-primary data-active:font-semibold data-active:shadow-none data-active:bg-transparent overflow-hidden cursor-pointer"
                    >
                        Cuentas Virtuales
                        <span className="absolute bottom-0 left-0 h-[2px] w-full bg-primary origin-left scale-x-0 transition-transform duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-x-100 group-data-active:scale-x-100" />
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="wallets" className="pt-2">
                    <WalletsSection isApproved={isApproved} />
                </TabsContent>

                <TabsContent value="virtual-accounts" className="pt-2">
                    <VirtualAccountsSection isApproved={isApproved} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

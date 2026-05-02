"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Copy, Loader2, ShieldAlert, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

// ── Token Row (with Icons) ─────────────────────────

const TOKEN_ICONS: Record<string, string> = {
    USDC: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/usdc.svg",
    USDT: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/usdt.svg",
    USDB: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/usd.svg", // Fallback to generic USD
    PYUSD: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/usd.svg",
    UERC: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/generic.svg",
};

function TokenRow({
    currency,
    balance,
}: {
    currency: string;
    balance: number;
}) {
    const tokenLabel = TOKEN_LABELS[currency] ?? currency;
    const iconUrl = TOKEN_ICONS[currency] ?? TOKEN_ICONS["USDB"];

    const iconBgClass =
        currency === "USDC"
            ? "bg-[#2775ca]"
            : currency === "USDT"
              ? "bg-[#26a17b]"
              : currency === "USDB"
                ? "bg-[#0052ff]"
                : currency === "PYUSD"
                  ? "bg-[#0079c1]"
                  : currency === "UERC"
                    ? "bg-[#5574c2]"
                    : "bg-primary";

    return (
        <div className="group border-b border-border last:border-b-0">
            <div className="flex items-center justify-between gap-4 py-6 transition-colors hover:bg-muted/10">
                <div className="flex items-center gap-5 min-w-0">
                    <div
                        className={`relative flex size-12 sm:size-14 shrink-0 items-center justify-center rounded-full shadow-sm overflow-hidden bg-muted/20 border border-border/40`}
                    >
                        <img
                            src={iconUrl}
                            alt={currency}
                            className="size-full object-cover"
                            onError={(e) => {
                                e.currentTarget.style.display = "none";
                                if (e.currentTarget.nextElementSibling) {
                                    (
                                        e.currentTarget
                                            .nextElementSibling as HTMLElement
                                    ).style.display = "flex";
                                }
                            }}
                        />
                        <div
                            className={`hidden absolute inset-0 size-full items-center justify-center ${iconBgClass}`}
                        >
                            <span className="text-white font-bold text-sm">
                                {currency.slice(0, 1)}
                            </span>
                        </div>
                    </div>
                    <div className="min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2.5">
                            <span className="text-lg sm:text-xl font-semibold text-foreground tracking-tight leading-tight">
                                {currency}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm sm:text-base text-muted-foreground">
                                {tokenLabel}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end justify-center shrink-0">
                    <span
                        className={`text-xl sm:text-3xl font-normal tracking-tight tabular-nums ${balance > 0 ? "text-foreground" : "text-muted-foreground"}`}
                    >
                        {balance > 0 ? "$" : ""}
                        {balance.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </span>
                </div>
            </div>
        </div>
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

    // Total balance across all wallets
    const totalBalance = wallets.reduce(
        (sum, w) => sum + (w.available_balance ?? 0),
        0,
    );

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
                <Card className="border-dashed border-border/40 bg-muted/10 mx-auto max-w-2xl mt-8">
                    <CardContent className="flex min-h-[28vh] flex-col items-center justify-center gap-5 text-center px-4 py-12">
                        <div className="relative flex size-16 items-center justify-center rounded-full border border-border bg-background shadow-sm ring-4 ring-muted/50">
                            <Wallet className="size-6 text-muted-foreground/50" />
                        </div>
                        <div className="max-w-sm">
                            <p className="text-lg font-semibold tracking-tight text-foreground">
                                No hay wallets activas
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                                {isApproved
                                    ? "Tus wallets se están aprovisionando en nuestra infraestructura blockchain de alta seguridad. Aparecerán aquí en unos instantes."
                                    : "Para mantener la seguridad de nuestra plataforma, completa tu verificación KYC/KYB para habilitar tus bóvedas y billeteras."}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Token Rows (Replaces Wallet Rows) */}
            {!loading && !error && wallets.length > 0 && (
                <div className="pt-2">
                    {DISPLAY_CURRENCIES.map((cur) => (
                        <TokenRow
                            key={cur}
                            currency={cur}
                            balance={aggregatedTokens[cur]}
                        />
                    ))}

                    {/* Separator line (navy/teal line matching design bottom border) */}
                    <div className="mt-8 mb-6 border-t-[3px] border-primary" />

                    {/* Footer: Total Balance + Wallet info */}
                    <div className="py-2">
                        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
                            {/* Left: Total balance */}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                                    Valor Total de Activos
                                </p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-5xl text-primary font-semibold tracking-tighter text-foreground tabular-nums leading-none">
                                        $
                                        {totalBalance.toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </span>
                                </div>
                            </div>

                            {/* Right: Wallet info */}
                            <div className="flex flex-col items-start md:items-end gap-2 text-right">
                                {walletNetwork && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            Red
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className="rounded-sm px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider border-primary/30 bg-primary/5 text-primary"
                                        >
                                            {networkBadge}
                                        </Badge>
                                        <span className="text-xs font-semibold text-foreground">
                                            {walletNetwork}
                                        </span>
                                    </div>
                                )}
                                {walletAddress && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            Dirección Wallet
                                        </span>
                                        <span className="font-mono text-xs text-foreground">
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
                                            className="text-muted-foreground/40 hover:text-foreground transition-colors"
                                            title="Copiar dirección"
                                        >
                                            <Copy className="size-3" />
                                        </button>
                                    </div>
                                )}
                                {walletId && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            Nro. Cuenta
                                        </span>
                                        <span className="font-mono text-xs text-foreground">
                                            {walletId.slice(0, 8).toUpperCase()}
                                            ...
                                            {walletId.slice(-4).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            {!loading && wallets.length > 0 && (
                <p className="text-center text-[11px] text-muted-foreground pt-4">
                    Las wallets son administradas por Bridge y respaldadas por
                    activos digitales reales. Los balances se actualizan en
                    tiempo real mediante webhooks.
                </p>
            )}
        </div>
    );
}

// ── Main Page ────────────────────────────────────────────────────

export function MyAccountsPage() {
    const { profile } = useProfileStore();
    const isApproved = profile?.onboarding_status === "approved";

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6">
            {/* Header */}
            <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[oklch(0.58_0.10_210)]">
                    Mis Cuentas
                </p>
                <h1 className="mt-1.5 text-2xl sm:text-4xl font-semibold tracking-tight text-foreground">
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
                        className="group relative flex-none rounded-none border-0 bg-transparent px-0 pb-3 pt-1 text-xl font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground data-active:text-primary data-active:font-semibold data-active:shadow-none data-active:bg-transparent overflow-hidden cursor-pointer"
                    >
                        Wallets
                        <span className="absolute bottom-0 left-0 h-[2px] w-full bg-primary origin-left scale-x-0 transition-transform duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-x-100 group-data-active:scale-x-100" />
                    </TabsTrigger>

                    <TabsTrigger
                        value="virtual-accounts"
                        className="group relative flex-none rounded-none border-0 bg-transparent px-0 pb-3 pt-1 text-xl font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground data-active:text-primary data-active:font-semibold data-active:shadow-none data-active:bg-transparent overflow-hidden cursor-pointer"
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

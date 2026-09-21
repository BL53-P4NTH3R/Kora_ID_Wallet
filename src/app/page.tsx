import Link from "next/link";
import {
  Shield,
  ShieldCheck,
  Fingerprint,
  QrCode,
  Lock,
  Smartphone,
  ArrowRight,
  KeyRound,
  Eye,
  FileSignature,
  Cpu,
  Globe,
  CheckCircle2,
  Layers,
  BadgeCheck,
  Wifi,
  WifiOff,
  Server,
} from "lucide-react";

// ---------------------------------------------------------------------------
//  Metadata
// ---------------------------------------------------------------------------

export const metadata = {
  title: "Kora ID — Nigeria's Official Digital Identity Wallet",
  description:
    "Kora ID empowers Nigerian citizens with a privacy-first digital identity wallet for NIN, Driver's License, and NYSC credentials. Selective sharing, offline verification, and hardware-bound security.",
};

// ---------------------------------------------------------------------------
//  Landing Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ----------------------------------------------------------------- */}
      {/*  Navigation                                                       */}
      {/* ----------------------------------------------------------------- */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700">
              <Shield className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              Kora<span className="text-emerald-700">ID</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden items-center gap-8 text-sm font-medium text-slate-500 md:flex">
            <a href="#features" className="transition-colors hover:text-slate-900">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-slate-900">
              How It Works
            </a>
            <a href="#trust" className="transition-colors hover:text-slate-900">
              Trust & Privacy
            </a>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/verifier"
              className="hidden rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 sm:inline-flex"
            >
              Verifier Portal
            </Link>
            <Link
              href="/wallet"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-600"
            >
              Open Wallet
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ----------------------------------------------------------------- */}
      {/*  Hero Section                                                     */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        {/* Subtle geometric background pattern */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-24 right-0 h-[500px] w-[500px] rounded-full bg-emerald-50 opacity-60 blur-3xl" />
          <div className="absolute bottom-0 -left-24 h-[400px] w-[400px] rounded-full bg-slate-100 opacity-60 blur-3xl" />
        </div>

        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-5 pt-20 pb-20 text-center sm:px-8 sm:pt-28 sm:pb-24">
          {/* Status Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-800">
            <BadgeCheck className="h-3.5 w-3.5" />
            Official Digital Identity Standard
          </div>

          {/* Headline */}
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
            Your Identity,{" "}
            <span className="text-emerald-700">Your Control</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            Kora ID is Nigeria&apos;s privacy-first digital identity wallet.
            Carry your NIN, Driver&apos;s License, and NYSC credentials on
            your device — share only what&apos;s needed, nothing more.
          </p>

          {/* Hero CTAs */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/wallet"
              id="hero-cta-wallet"
              className="group inline-flex items-center gap-2.5 rounded-xl bg-emerald-700 px-7 py-3.5 text-base font-bold text-white shadow-md shadow-emerald-900/10 transition-all hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-900/15"
            >
              <Smartphone className="h-5 w-5" />
              Launch Digital Wallet
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/verifier"
              id="hero-cta-verifier"
              className="inline-flex items-center gap-2.5 rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-base font-semibold text-slate-800 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-50"
            >
              <ShieldCheck className="h-5 w-5 text-slate-500" />
              Verify a Credential
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-slate-500">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-600" />
              Bank-Grade Encryption
            </div>
            <div className="hidden h-5 w-px bg-slate-200 sm:block" />
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-emerald-600" />
              Hardware-Bound Security
            </div>
            <div className="hidden h-5 w-px bg-slate-200 sm:block" />
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-600" />
              Global eIDAS 2.0 Standard
            </div>
            <div className="hidden h-5 w-px bg-slate-200 sm:block" />
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-emerald-600" />
              Offline Capable
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/*  Credential Showcase                                              */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-20 px-5 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
              Supported Credentials
            </p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              All Your Government-Issued IDs in One Place
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* NIN */}
            <CredentialShowcard
              icon={<Fingerprint className="h-6 w-6 text-emerald-700" />}
              iconBg="bg-emerald-50"
              title="National Identification Number"
              description="Your NIN credential issued by NIMC — prove your identity, age, or nationality while sharing only the details you choose."
              issuer="NIMC"
              issuerColor="text-emerald-700"
            />

            {/* FRSC */}
            <CredentialShowcard
              icon={<KeyRound className="h-6 w-6 text-amber-700" />}
              iconBg="bg-amber-50"
              title="Driver's License"
              description="FRSC-issued digital driver's license — share your license class or prove your age without revealing your home address."
              issuer="FRSC"
              issuerColor="text-amber-700"
            />

            {/* NYSC */}
            <CredentialShowcard
              icon={<Layers className="h-6 w-6 text-violet-700" />}
              iconBg="bg-violet-50"
              title="NYSC Service Pass"
              description="Digital corps member credential — verify your service status, batch, and deployment without paper certificates."
              issuer="NYSC"
              issuerColor="text-violet-700"
            />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/*  Features                                                         */}
      {/* ----------------------------------------------------------------- */}
      <section
        id="features"
        className="border-t border-slate-200 bg-white py-20 px-5 sm:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
              Features
            </p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Privacy-First Identity Infrastructure
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Built on internationally recognised open standards to give
              Nigerian citizens a world-class digital identity experience.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Eye className="h-5 w-5" />}
              iconBg="bg-emerald-50 text-emerald-700"
              title="Selective Sharing"
              description="Reveal only the attributes you choose. Prove you're over 18 without sharing your full date of birth or address."
            />
            <FeatureCard
              icon={<QrCode className="h-5 w-5" />}
              iconBg="bg-sky-50 text-sky-700"
              title="Instant QR Presentations"
              description="Generate time-limited QR codes for contactless credential sharing — works in seconds, no mobile data required."
            />
            <FeatureCard
              icon={<Lock className="h-5 w-5" />}
              iconBg="bg-amber-50 text-amber-700"
              title="Hardware-Bound Keys"
              description="Cryptographic keys generated and stored in your device's secure enclave. Your keys never leave your phone."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-5 w-5" />}
              iconBg="bg-violet-50 text-violet-700"
              title="Offline Verification"
              description="Verifiers validate credentials locally using encrypted proofs — no internet connection or central database required."
            />
            <FeatureCard
              icon={<FileSignature className="h-5 w-5" />}
              iconBg="bg-rose-50 text-rose-700"
              title="Digital Signatures"
              description="Sign documents with your identity-bound key — producing internationally compliant, legally valid digital signatures."
            />
            <FeatureCard
              icon={<Fingerprint className="h-5 w-5" />}
              iconBg="bg-teal-50 text-teal-700"
              title="Holder Binding"
              description="Every presentation is cryptographically bound to your device — preventing credential theft, copying, or relay attacks."
            />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/*  How It Works                                                     */}
      {/* ----------------------------------------------------------------- */}
      <section
        id="how-it-works"
        className="border-t border-slate-200 py-20 px-5 sm:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
              How It Works
            </p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Three Simple Steps
            </h2>
          </div>

          <div className="mt-14 grid gap-10 md:grid-cols-3">
            <StepCard
              step="01"
              title="Receive Your Credentials"
              description="Authorised agencies (NIMC, FRSC, NYSC) issue verified digital credentials directly to your secure wallet."
            />
            <StepCard
              step="02"
              title="Choose What to Share"
              description="Toggle which details to disclose — name, age proof, license class — you decide what's visible each time."
            />
            <StepCard
              step="03"
              title="Present & Verify Instantly"
              description="Show a time-limited QR code or digital token. The verifier confirms your encrypted proof in seconds, offline."
            />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/*  Trust & Privacy                                                  */}
      {/* ----------------------------------------------------------------- */}
      <section
        id="trust"
        className="border-t border-slate-200 bg-white py-20 px-5 sm:px-8"
      >
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
            Trust & Privacy
          </p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Minimal Disclosure, Maximum Security
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Kora ID follows data minimisation principles. No central server
            stores your credentials. No issuer learns when or where you present.
            Your identity stays yours.
          </p>

          <div className="mt-12 grid gap-5 text-left sm:grid-cols-2">
            <TrustItem
              title="No Phone-Home"
              description="Credential verification is purely cryptographic and local — issuing authorities are never contacted during presentations."
            />
            <TrustItem
              title="Unlinkable Proofs"
              description="Fresh tokens and unique salted disclosures prevent services from correlating your activity across platforms."
            />
            <TrustItem
              title="Open Standards"
              description="Built on internationally recognised IETF, OpenID, and W3C standards — no proprietary lock-in or vendor dependency."
            />
            <TrustItem
              title="Client-Side Processing"
              description="All cryptographic operations — key generation, signing, verification — happen entirely on your device. Nothing is sent to a backend."
            />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/*  Final CTA                                                        */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-slate-200 py-20 px-5 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Ready to take control of your digital identity?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">
            Open the wallet to explore your verified credentials, or use the
            verifier portal to validate a presentation.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/wallet"
              id="cta-wallet-bottom"
              className="group inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-7 py-3.5 text-base font-bold text-white shadow-md shadow-emerald-900/10 transition-all hover:bg-emerald-600 hover:shadow-lg"
            >
              <Smartphone className="h-5 w-5" />
              Open Wallet
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/verifier"
              id="cta-verifier-bottom"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-base font-semibold text-slate-800 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-50"
            >
              <ShieldCheck className="h-5 w-5 text-slate-500" />
              Verifier Portal
            </Link>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/*  Footer                                                           */}
      {/* ----------------------------------------------------------------- */}
      <footer className="border-t border-slate-200 bg-white py-10 px-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-700">
              <Shield className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold text-slate-700">
              Kora<span className="text-emerald-700">ID</span>
            </span>
          </div>
          <p className="text-slate-400">
            Team Jupyter &middot; Federated Digital Identity &middot; Nigeria
          </p>
          <div className="flex gap-5 font-medium">
            <Link href="/wallet" className="transition-colors hover:text-slate-900">
              Wallet
            </Link>
            <Link href="/verifier" className="transition-colors hover:text-slate-900">
              Verifier
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Sub-Components
// ---------------------------------------------------------------------------

function CredentialShowcard({
  icon,
  iconBg,
  title,
  description,
  issuer,
  issuerColor,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  issuer: string;
  issuerColor: string;
}) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}
      >
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        {description}
      </p>
      <div
        className={`mt-4 inline-flex items-center gap-1.5 text-xs font-semibold ${issuerColor}`}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Issued by {issuer}
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  iconBg,
  title,
  description,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 transition-all hover:border-slate-300 hover:bg-white hover:shadow-sm">
      <div
        className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}
      >
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="relative text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-xl font-black text-emerald-700">
        {step}
      </div>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}

function TrustItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 transition-colors hover:bg-white hover:shadow-sm">
      <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        {title}
      </h4>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}

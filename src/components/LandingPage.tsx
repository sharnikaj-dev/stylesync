import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ExternalLink, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Product, StudioTab } from '../types/stylesync';
import { ImageWithFallback } from './ui/ImageWithFallback';

interface LandingPageProps {
  onEnterStudio: (tab?: StudioTab) => void;
}

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Upload Your Photograph',
    desc: 'Share a portrait or outfit snapshot privately. Photos stay scoped to your account and can be deleted anytime.',
  },
  {
    step: '02',
    title: 'Discover Your Personal Style',
    desc: 'Receive approximate undertone guidance, a tailored color palette, and silhouette suggestions tailored to your preferences.',
  },
  {
    step: '03',
    title: 'Get Complete Outfit Curation',
    desc: 'Describe an occasion and budget in plain language to receive head-to-toe looks blending your wardrobe and curated pieces.',
  },
  {
    step: '04',
    title: 'Compare Products & Shop Smart',
    desc: 'Evaluate listings side by side across Myntra, Flipkart, and Meesho using balanced price, rating, and value indicators.',
  },
];

const COLLECTIONS = [
  {
    title: 'Modern Festive & Handloom',
    subtitle: 'Chanderi kurtis, ivory palazzos, and antique gold accents',
    image: '/src/assets/images/collection_modern_ethnic_1795618610949.jpg',
    tab: 'ai-stylist' as StudioTab,
  },
  {
    title: 'Minimalist Tailoring',
    subtitle: 'Warm beige wide-leg trousers, silk shirting, and leather totes',
    image: '/src/assets/images/collection_minimal_tailoring_1795618608810.jpg',
    tab: 'wardrobe' as StudioTab,
  },
  {
    title: 'Urban Street Fusion',
    subtitle: 'Heavyweight cotton tees, utility cargos, and crisp court sneakers',
    image: '/src/assets/images/collection_street_fusion_1795618608700.jpg',
    tab: 'match-decode' as StudioTab,
  },
];

const OCCASIONS = [
  {
    title: 'Diwali & Festive Evenings',
    detail: 'Breathable handloom silhouettes under ₹3,000',
    prompt: 'I need a stylish outfit for Diwali under ₹3,000 with a modern traditional touch',
  },
  {
    title: 'Boardroom & Workwear',
    detail: 'Structured ivory blazers and tailored trousers',
    prompt: 'Curate a polished minimalist workwear outfit with an ivory blazer and loafers',
  },
  {
    title: 'Weekend Gallery & Brunch',
    detail: 'Relaxed pleated midis and crossbody accents',
    prompt: 'Suggest an effortless weekend brunch outfit with muted rose tones',
  },
  {
    title: 'Travel Capsule Packing',
    detail: 'Mix-and-match outfits that reduce luggage bulk',
    prompt: 'Plan a versatile 4-day capsule wardrobe for mild coastal weather',
  },
];

const DEMO_TESTIMONIALS = [
  {
    quote:
      'Seeing which colors flatter my undertone while building outfits from clothes I already own cut my impulse shopping by half.',
    author: 'Ananya Deshmukh',
    role: 'Product Designer, Bengaluru · Demonstration Profile',
  },
  {
    quote:
      'Instead of picking the cheapest listing blindly, the Best Value comparison highlighted a higher-rated kurti only ₹100 more.',
    author: 'Meera Nair',
    role: 'Brand Strategist, Mumbai · Demonstration Profile',
  },
  {
    quote:
      'The Outfit Recreator checked my closet before recommending anything new, so I only bought one pair of tan loafers.',
    author: 'Rohan Kapoor',
    role: 'Architect, New Delhi · Demonstration Profile',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterStudio }) => {
  const { firebaseUser, signInWithGoogle } = useAuth();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.products)) {
          setFeaturedProducts(data.products.slice(0, 3));
        }
      })
      .catch(() => {});
  }, []);

  const handleAction = async (targetTab: StudioTab = 'dashboard') => {
    if (firebaseUser) {
      onEnterStudio(targetTab);
      return;
    }
    setAuthLoading(true);
    try {
      await signInWithGoogle();
      onEnterStudio(targetTab);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1917]">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-sm border-b border-[#E7E2DA]">
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-editorial text-2xl font-semibold tracking-tight text-[#1C1917] whitespace-nowrap shrink-0"
          >
            StyleSync AI
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#57534E]">
            <a
              href="#how-it-works"
              className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#features"
              className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#collections"
              className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Collections
            </a>
            <a
              href="#smart-shopping"
              className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Smart Shopping
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              onClick={() => handleAction('dashboard')}
              disabled={authLoading}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#1C1917] rounded-lg hover:bg-[#342F2C] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              {firebaseUser ? 'Open Studio' : authLoading ? 'Signing In...' : 'Sign In & Start'}
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero Section */}
        <section className="max-w-[1280px] mx-auto px-6 pt-12 pb-20 lg:pt-16 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="lg:col-span-5 flex flex-col justify-center"
            >
              <p className="text-xs font-medium tracking-wide text-[#9D5C63] mb-4">
                Your Style · Your Fit · Your Personal AI Stylist
              </p>
              <h1 className="font-editorial text-[clamp(2.5rem,4.4vw,3.9rem)] leading-[1.06] font-semibold tracking-tight text-[#1C1917] text-balance mb-6">
                Discover Your Style. Redefine Your Look.
              </h1>
              <p className="text-base leading-relaxed text-[#57534E] max-w-lg mb-8">
                StyleSync AI brings together computer-vision color analysis, conversational outfit
                curation, your digital wardrobe, and transparent multi-platform shopping
                comparisons in one calm atelier.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => handleAction('style-analysis')}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-[#9D5C63] rounded-lg hover:bg-[#864B52] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Upload Your Photo
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleAction('ai-stylist')}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-[#1C1917] bg-[#F2EDE6] border border-[#E2DBD0] rounded-lg hover:bg-[#EAE3D9] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Explore Styles
                </button>
              </div>

              <div className="mt-10 pt-8 border-t border-[#E7E2DA] grid grid-cols-3 gap-6 text-sm">
                <div>
                  <div className="font-editorial text-2xl font-semibold text-[#1C1917] tabular-nums">
                    10+
                  </div>
                  <div className="text-xs text-[#57534E] mt-1">AI Styling Modules</div>
                </div>
                <div>
                  <div className="font-editorial text-2xl font-semibold text-[#1C1917] tabular-nums">
                    3 Platforms
                  </div>
                  <div className="text-xs text-[#57534E] mt-1">Myntra · Flipkart · Meesho</div>
                </div>
                <div>
                  <div className="font-editorial text-2xl font-semibold text-[#1C1917] tabular-nums">
                    100%
                  </div>
                  <div className="text-xs text-[#57534E] mt-1">Wardrobe Reuse Focus</div>
                </div>
              </div>
            </motion.div>

            <div className="lg:col-span-7">
              <div className="relative h-full min-h-[360px] lg:min-h-[520px] rounded-xl overflow-hidden border border-[#E7E2DA]">
                <ImageWithFallback
                  src="/src/assets/images/hero_editorial_fashion_1795618608440.jpg"
                  alt="StyleSync AI editorial atelier showcase"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/75 via-black/35 to-transparent text-white">
                  <p className="text-xs text-white/80 mb-1">
                    Editorial Lookbook · Personalized Palette & Fit
                  </p>
                  <p className="font-editorial text-xl font-medium">
                    Tailored Champagne Linen & Muted Rose Silk Drape
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="border-t border-[#E7E2DA] bg-[#F4EFE8]/70 py-20">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <p className="text-xs font-medium text-[#9D5C63] mb-2">How It Works</p>
              <h2 className="font-editorial text-3xl lg:text-4xl font-semibold text-[#1C1917] text-balance">
                From personal color clarity to intentional wardrobe decisions
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {HOW_IT_WORKS.map((item) => (
                <div
                  key={item.step}
                  className="bg-white border border-[#E7E2DA] rounded-xl p-6 flex flex-col justify-between"
                >
                  <div>
                    <span className="font-mono-num text-xs text-[#9D5C63] font-medium">
                      {item.step}.
                    </span>
                    <h3 className="text-lg font-semibold text-[#1C1917] mt-3 mb-2">{item.title}</h3>
                    <p className="text-sm text-[#57534E] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured AI Features Bento */}
        <section id="features" className="py-20 max-w-[1280px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <p className="text-xs font-medium text-[#9D5C63] mb-2">Featured Intelligence</p>
              <h2 className="font-editorial text-3xl lg:text-4xl font-semibold text-[#1C1917] text-balance">
                Every styling tool connected to your wardrobe
              </h2>
            </div>
            <button
              onClick={() => handleAction('dashboard')}
              className="text-sm font-medium text-[#1C1917] hover:text-[#9D5C63] underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Launch Full Workspace
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            <div className="md:col-span-3 bg-white border border-[#E7E2DA] rounded-xl p-7 flex flex-col justify-between">
              <div>
                <p className="text-xs text-[#57534E] mb-2">Computer Vision · Body-Positive</p>
                <h3 className="font-editorial text-2xl font-semibold text-[#1C1917] mb-3">
                  Personal Style Analysis
                </h3>
                <p className="text-sm text-[#57534E] leading-relaxed mb-6">
                  Upload a photo to receive approximate skin undertone guidance, a 6-swatch color
                  palette, silhouette ideas, and full control to edit or delete your images anytime.
                </p>
              </div>
              <button
                onClick={() => handleAction('style-analysis')}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#9D5C63] hover:text-[#7A444A] cursor-pointer"
              >
                Analyze My Style <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="md:col-span-3 bg-white border border-[#E7E2DA] rounded-xl p-7 flex flex-col justify-between">
              <div>
                <p className="text-xs text-[#57534E] mb-2">Conversational Stylist · INR Budgets</p>
                <h3 className="font-editorial text-2xl font-semibold text-[#1C1917] mb-3">
                  AI Fashion Stylist
                </h3>
                <p className="text-sm text-[#57534E] leading-relaxed mb-6">
                  Ask in natural language—from Diwali looks under ₹3,000 to rainy-day office attire.
                  Swap individual footwear or jewellery items without regenerating the entire outfit.
                </p>
              </div>
              <button
                onClick={() => handleAction('ai-stylist')}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#9D5C63] hover:text-[#7A444A] cursor-pointer"
              >
                Consult AI Stylist <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="md:col-span-2 bg-white border border-[#E7E2DA] rounded-xl p-6 flex flex-col justify-between">
              <div>
                <p className="text-xs text-[#57534E] mb-2">Fit & Drape Studio</p>
                <h3 className="text-xl font-semibold text-[#1C1917] mb-2">Virtual Try-On</h3>
                <p className="text-sm text-[#57534E] leading-relaxed mb-5">
                  Evaluate garment drape, color harmony, and AI try-on previews against your portrait.
                </p>
              </div>
              <button
                onClick={() => handleAction('virtual-try-on')}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#1C1917] hover:text-[#9D5C63] cursor-pointer"
              >
                Open Try-On <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="md:col-span-2 bg-white border border-[#E7E2DA] rounded-xl p-6 flex flex-col justify-between">
              <div>
                <p className="text-xs text-[#57534E] mb-2">Cost-Per-Wear & Gap Insights</p>
                <h3 className="text-xl font-semibold text-[#1C1917] mb-2">Digital Wardrobe</h3>
                <p className="text-sm text-[#57534E] leading-relaxed mb-5">
                  Catalog what you own, track wears, calculate cost-per-wear, and recreate viral looks
                  before buying new items.
                </p>
              </div>
              <button
                onClick={() => handleAction('wardrobe')}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#1C1917] hover:text-[#9D5C63] cursor-pointer"
              >
                Open Wardrobe <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="md:col-span-2 bg-white border border-[#E7E2DA] rounded-xl p-6 flex flex-col justify-between">
              <div>
                <p className="text-xs text-[#57534E] mb-2">Myntra · Flipkart · Meesho</p>
                <h3 className="text-xl font-semibold text-[#1C1917] mb-2">Smart Shopping</h3>
                <p className="text-sm text-[#57534E] leading-relaxed mb-5">
                  Compare prices, customer ratings, and value scores side by side, plus get size
                  predictions across brands.
                </p>
              </div>
              <button
                onClick={() => handleAction('smart-shopping')}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#1C1917] hover:text-[#9D5C63] cursor-pointer"
              >
                Compare Products <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Featured Outfit Collections */}
        <section id="collections" className="border-t border-[#E7E2DA] bg-[#F4EFE8]/70 py-20">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="mb-12">
              <p className="text-xs font-medium text-[#9D5C63] mb-2">Curated Lookbooks</p>
              <h2 className="font-editorial text-3xl lg:text-4xl font-semibold text-[#1C1917]">
                Featured Outfit Collections
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {COLLECTIONS.map((col) => (
                <button
                  key={col.title}
                  onClick={() => handleAction(col.tab)}
                  className="group text-left bg-white border border-[#E7E2DA] rounded-xl overflow-hidden hover:-translate-y-0.5 transition-transform cursor-pointer"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#EFEAE2]">
                    <ImageWithFallback
                      src={col.image}
                      alt={col.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-editorial text-2xl font-semibold text-[#1C1917] mb-1.5">
                      {col.title}
                    </h3>
                    <p className="text-sm text-[#57534E]">{col.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Occasion-Based Fashion Inspiration */}
        <section className="py-20 max-w-[1280px] mx-auto px-6">
          <div className="mb-10">
            <p className="text-xs font-medium text-[#9D5C63] mb-2">Occasion Inspiration</p>
            <h2 className="font-editorial text-3xl lg:text-4xl font-semibold text-[#1C1917]">
              Dressed thoughtfully for every calendar moment
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {OCCASIONS.map((occ) => (
              <div
                key={occ.title}
                className="bg-white border border-[#E7E2DA] rounded-xl p-6 flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-base font-semibold text-[#1C1917] mb-2">{occ.title}</h3>
                  <p className="text-sm text-[#57534E] mb-6">{occ.detail}</p>
                </div>
                <button
                  onClick={() => handleAction('ai-stylist')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9D5C63] hover:text-[#7A444A] cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Style This Occasion
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Shopping Comparison Introduction */}
        <section id="smart-shopping" className="border-t border-[#E7E2DA] bg-white py-20">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <p className="text-xs font-medium text-[#9D5C63] mb-2">
                  Smart Shopping Comparison · Demonstration Catalog
                </p>
                <h2 className="font-editorial text-3xl lg:text-4xl font-semibold text-[#1C1917]">
                  Best value, not just lowest price
                </h2>
              </div>
              <p className="text-xs text-[#57534E] max-w-md">
                Multi-factor scoring weighs price savings alongside customer ratings and review
                depth. Demonstration dataset shown until live affiliate feeds are connected.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredProducts.map((product) => (
                <div
                  key={product.id}
                  className="border border-[#E7E2DA] rounded-xl overflow-hidden bg-[#FAF8F5] flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[4/3] bg-[#EFEAE2]">
                      <ImageWithFallback
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-5">
                      <p className="text-xs text-[#57534E] mb-1">
                        {product.brand} · {product.category}
                      </p>
                      <h3 className="text-base font-semibold text-[#1C1917] mb-4">{product.name}</h3>

                      <div className="space-y-2.5">
                        {(product.comparison?.scoredListings || []).map((listing) => (
                          <div
                            key={listing.platform}
                            className="flex items-center justify-between text-xs py-2 border-t border-[#E7E2DA]"
                          >
                            <div>
                              <span className="font-semibold text-[#1C1917]">{listing.platform}</span>
                              {listing.badges.length > 0 && (
                                <span className="ml-2 text-[11px] font-medium text-[#9D5C63]">
                                  {listing.badges[0]}
                                </span>
                              )}
                            </div>
                            <div className="font-mono-num text-[#1C1917]">
                              ₹{listing.currentPrice.toLocaleString('en-IN')} · {listing.rating}★
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <button
                      onClick={() => handleAction('smart-shopping')}
                      className="w-full py-2.5 px-4 text-xs font-medium text-[#1C1917] bg-white border border-[#E2DBD0] rounded-lg hover:bg-[#F2EDE6] transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Compare & Check Fit <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials (Clearly Identified Demonstration Content) */}
        <section className="py-20 max-w-[1280px] mx-auto px-6">
          <div className="mb-10">
            <p className="text-xs font-medium text-[#9D5C63] mb-2">
              Community Perspectives · Demonstration Content
            </p>
            <h2 className="font-editorial text-3xl font-semibold text-[#1C1917]">
              Designed for thoughtful everyday dressing
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DEMO_TESTIMONIALS.map((item) => (
              <blockquote
                key={item.author}
                className="bg-white border border-[#E7E2DA] rounded-xl p-6 flex flex-col justify-between"
              >
                <p className="text-sm leading-relaxed text-[#44403C] mb-6">“{item.quote}”</p>
                <footer>
                  <div className="text-sm font-semibold text-[#1C1917]">{item.author}</div>
                  <div className="text-xs text-[#57534E] mt-0.5">{item.role}</div>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>

        {/* Final Call to Action */}
        <section className="border-t border-[#E7E2DA] bg-[#1C1917] text-[#FAF8F5] py-20">
          <div className="max-w-[900px] mx-auto px-6 text-center">
            <h2 className="font-editorial text-4xl lg:text-5xl font-semibold mb-4 text-balance">
              Build a wardrobe that fits who you are
            </h2>
            <p className="text-sm lg:text-base text-[#D6D0C7] max-w-xl mx-auto mb-8">
              Sign in with Google to save your digital wardrobe, unlock AI style analysis, plan
              occasions, and track price drops across Indian fashion platforms.
            </p>
            <button
              onClick={() => handleAction('dashboard')}
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium text-[#1C1917] bg-[#FAF8F5] rounded-lg hover:bg-[#EFEAE2] transition-colors cursor-pointer"
            >
              Enter StyleSync AI Studio
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-[#E7E2DA] bg-[#FAF8F5] py-10">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#57534E]">
          <div className="font-editorial text-lg font-semibold text-[#1C1917]">StyleSync AI</div>
          <div>Your Style. Your Fit. Your Personal AI Stylist.</div>
          <div>© {new Date().getFullYear()} StyleSync AI</div>
        </div>
      </footer>
    </div>
  );
};

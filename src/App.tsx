import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './components/LandingPage';
import { OnboardingModal } from './components/OnboardingModal';
import { StudioShell } from './components/StudioShell';
import { DashboardHome } from './features/DashboardHome';
import { StyleAnalysisView } from './features/StyleAnalysisView';
import { AiStylistView } from './features/AiStylistView';
import { StylistChatView } from './features/StylistChatView';
import { VirtualTryOnView } from './features/VirtualTryOnView';
import { RunwayVideoView } from './features/RunwayVideoView';
import { MatchAndDecodeView } from './features/MatchAndDecodeView';
import { DigitalWardrobeView } from './features/DigitalWardrobeView';
import { SmartShoppingView } from './features/SmartShoppingView';
import { ColorLabAndTwinView } from './features/ColorLabAndTwinView';
import { CalendarAndTravelView } from './features/CalendarAndTravelView';
import { SavedAndDecisionView } from './features/SavedAndDecisionView';
import { AdminConsoleView } from './features/AdminConsoleView';
import { StudioTab } from './types/stylesync';

function StyleSyncRouter() {
  const { firebaseUser, dbUser, loading } = useAuth();
  const [inStudio, setInStudio] = useState(false);
  const [activeTab, setActiveTab] = useState<StudioTab>('dashboard');
  const [dismissOnboarding, setDismissOnboarding] = useState(false);

  const handleEnterStudio = (tab: StudioTab = 'dashboard') => {
    setActiveTab(tab);
    setInStudio(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="text-center">
          <div className="font-editorial text-3xl font-semibold text-[#1C1917]">StyleSync AI</div>
          <div className="text-xs text-[#57534E] mt-2">Preparing your personal atelier...</div>
        </div>
      </div>
    );
  }

  if (!inStudio || !firebaseUser) {
    return <LandingPage onEnterStudio={handleEnterStudio} />;
  }

  const showOnboarding = Boolean(dbUser && !dbUser.onboardingCompleted && !dismissOnboarding);

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardHome onNavigate={setActiveTab} />;
      case 'style-analysis':
        return <StyleAnalysisView />;
      case 'ai-stylist':
        return <AiStylistView />;
      case 'stylist-chat':
        return <StylistChatView />;
      case 'virtual-try-on':
        return <VirtualTryOnView />;
      case 'runway-video':
        return <RunwayVideoView />;
      case 'match-decode':
        return <MatchAndDecodeView />;
      case 'wardrobe':
        return <DigitalWardrobeView />;
      case 'smart-shopping':
        return <SmartShoppingView />;
      case 'color-lab':
        return <ColorLabAndTwinView initialMode="color" />;
      case 'fashion-twin':
        return <ColorLabAndTwinView initialMode="twin" />;
      case 'calendar-travel':
        return <CalendarAndTravelView />;
      case 'saved-decision':
        return <SavedAndDecisionView />;
      case 'admin':
        return dbUser?.role === 'admin' ? (
          <AdminConsoleView />
        ) : (
          <DashboardHome onNavigate={setActiveTab} />
        );
      default:
        return <DashboardHome onNavigate={setActiveTab} />;
    }
  };

  return (
    <>
      <StudioShell
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onReturnLanding={() => setInStudio(false)}
      >
        {renderTab()}
      </StudioShell>

      {showOnboarding && <OnboardingModal onComplete={() => setDismissOnboarding(true)} />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StyleSyncRouter />
    </AuthProvider>
  );
}

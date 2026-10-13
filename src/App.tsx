import { useState, useEffect, useRef } from 'react';
import { ArrowUp, ChevronRight } from 'lucide-react';
import type { WorkoutSession, Exercise, WorkoutTemplate, BodyMetricEntry, WorkoutDraft } from './types/workout';
import type { UpdateCheckResult } from './types/update';
import { storageService } from './services/storage';
import { updateService } from './services/updateService';
import { Header } from './components/Header';
import { Navbar, type TabType } from './components/Navbar';
import { WorkoutLogger } from './components/WorkoutLogger';
import { WorkoutHistory } from './components/WorkoutHistory';
import { AnalyticsView } from './components/AnalyticsView';
import { ExerciseLibrary } from './components/ExerciseLibrary';
import { ProfileView, type ProfileSubPage } from './components/ProfileView';
import { RestTimer } from './components/RestTimer';
import { DataBackupModal } from './components/DataBackupModal';
import { TechDocsModal } from './components/TechDocsModal';
import { UpdateModal } from './components/UpdateModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { BodyMetricsModal } from './components/BodyMetricsModal';
import { UnsettledWorkoutModal } from './components/UnsettledWorkoutModal';
import { cloudSyncService } from './services/cloudSyncService';
import { cloudAuthService } from './services/cloudAuthService';
import type { SyncStatusInfo } from './types/cloud';
import { ThemeModal } from './components/ThemeModal';
import { themeService } from './services/themeService';
import type { ThemeState } from './types/theme';
import './styles/base.css';
import './styles/app.css';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('logger');
  const mainContentRef = useRef<HTMLElement | null>(null);
  const loggerScrollTopRef = useRef<number>(0);
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [pinnedExerciseIds, setPinnedExerciseIds] = useState<string[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetricEntry[]>([]);
  const [workoutToCopy, setWorkoutToCopy] = useState<WorkoutSession | null>(null);
  const [exerciseToAdd, setExerciseToAdd] = useState<Exercise | null>(null);

  // Active workout draft tracking (for tab preservation & stale recovery)
  const [activeDraft, setActiveDraft] = useState<WorkoutDraft | null>(() => storageService.getWorkoutDraft());
  const [unsettledDraft, setUnsettledDraft] = useState<WorkoutDraft | null>(null);
  const [isUnsettledModalOpen, setIsUnsettledModalOpen] = useState<boolean>(false);
  const [bannerToast, setBannerToast] = useState<string | null>(null);

  const [isWideMode, setIsWideMode] = useState<boolean>(false);
  const [profileSubPage, setProfileSubPage] = useState<ProfileSubPage | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [isTechDocsModalOpen, setIsTechDocsModalOpen] = useState<boolean>(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);

  const [isCloudModalOpen, setIsCloudModalOpen] = useState<boolean>(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);
  const [isBodyMetricsModalOpen, setIsBodyMetricsModalOpen] = useState<boolean>(false);
  const [themeState, setThemeState] = useState<ThemeState>(() => themeService.init());
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>(cloudSyncService.getStatus());
  const [updateData, setUpdateData] = useState<UpdateCheckResult | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [isRestTimerActive, setIsRestTimerActive] = useState<boolean>(false);
  const [timerKey, setTimerKey] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async (isInitial = false) => {
    if (isInitial) {
      setIsLoading(true);
    }
    try {
      const loadedWorkouts = await storageService.getWorkouts();
      const loadedCustom = await storageService.getCustomExercises();
      const loadedPinned = storageService.getPinnedExerciseIds();
      const loadedTemplates = await storageService.getTemplates();
      const loadedMetrics = await storageService.getBodyMetrics();
      setWorkouts(loadedWorkouts);
      setCustomExercises(loadedCustom);
      setPinnedExerciseIds(loadedPinned);
      setTemplates(loadedTemplates);
      setBodyMetrics(loadedMetrics);
    } catch (e) {
      console.error('Failed to load initial data', e);
    } finally {
      if (isInitial) {
        setIsLoading(false);
      }
    }
  };

  const handleCheckUpdate = async (force = false) => {
    setIsCheckingUpdate(true);
    try {
      const res = await updateService.checkForUpdates(force);
      setUpdateData(res);
    } catch (e) {
      console.error('Failed to check for updates', e);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  useEffect(() => {
    loadData(true);

    // 订阅云端同步状态
    const unsubSync = cloudSyncService.subscribe(setSyncStatus);
    const unsubData = cloudSyncService.onRemoteDataChanged(() => {
      loadData();
    });

    // 若已开启私有云模式，启动时在后台静默发起一次同步
    if (cloudAuthService.isCloudModeActive()) {
      cloudSyncService.sync().catch(() => {});
    }

    // 启动时后台静默预检更新（非阻塞）
    updateService
      .checkForUpdates(false)
      .then((res) => setUpdateData(res))
      .catch(() => {});

    // 订阅主题切换
    const unsubTheme = themeService.subscribe(setThemeState);

    // 检查是否有历史或昨日未结算的训练草稿
    const draft = storageService.getWorkoutDraft();
    if (draft && storageService.isDraftMeaningful(draft)) {
      setActiveDraft(draft);
      const today = new Date().toISOString().split('T')[0];
      const isPastDate = draft.date < today;
      const isStale = Date.now() - (draft.lastModified || 0) > 4 * 60 * 60 * 1000;
      const completedSets = draft.exercises.reduce(
        (acc, ex) => acc + (ex.sets ? ex.sets.filter((s) => s.isCompleted).length : 0),
        0
      );

      // 如果是昨日遗留或超过4小时前且已有打卡记录，主动弹出智能补录提醒
      if ((isPastDate || isStale) && completedSets > 0) {
        setUnsettledDraft(draft);
        setIsUnsettledModalOpen(true);
      }
    }

    return () => {
      unsubSync();
      unsubData();
      unsubTheme();
    };
  }, []);

  const handleRecoverAsHistorical = async (draft: WorkoutDraft) => {
    const durationMin = Math.max(1, Math.round((draft.elapsedSeconds || 0) / 60));
    const recoveredSession: WorkoutSession = {
      id: 'session_' + (draft.lastModified || Date.now()),
      date: draft.date,
      title: draft.title || '训练日',
      exercises: draft.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => ({
          ...s,
          weightKg: Number(s.weightKg) || 0,
          reps: Number(s.reps) || 0,
          durationMinutes: s.durationMinutes ? Number(s.durationMinutes) : undefined,
          distanceKm: s.distanceKm ? Number(s.distanceKm) : undefined,
          caloriesKcal: s.caloriesKcal ? Number(s.caloriesKcal) : undefined,
          isCompleted: true,
        })),
      })),
      durationMinutes: durationMin,
      createdAt: new Date(draft.date).getTime() || Date.now(),
      notes: draft.notes,
    };

    await handleSaveWorkout(recoveredSession);
    storageService.clearWorkoutDraft();
    setActiveDraft(null);
    setIsUnsettledModalOpen(false);
    setBannerToast(`已成功补录 ${draft.date}「${draft.title}」训练记录！可在「历史」中查看。`);
    setTimeout(() => setBannerToast(null), 4000);
  };

  const handleContinueUnsettledWorkout = () => {
    setIsUnsettledModalOpen(false);
    setActiveTab('logger');
  };

  const handleDiscardUnsettledDraft = () => {
    storageService.clearWorkoutDraft();
    setActiveDraft(null);
    setIsUnsettledModalOpen(false);
    setBannerToast('已放弃并清空该未结算训练草稿');
    setTimeout(() => setBannerToast(null), 3000);
  };

  const isDraftActive = Boolean(activeDraft && storageService.isDraftMeaningful(activeDraft));
  const activeDraftCompletedSets = activeDraft?.exercises
    ? activeDraft.exercises.reduce(
        (acc, ex) => acc + (ex.sets ? ex.sets.filter((s) => s.isCompleted).length : 0),
        0
      )
    : 0;

  const handleSaveWorkout = async (session: WorkoutSession) => {
    await storageService.saveWorkout(session);
    setWorkouts((prev) => [session, ...prev.filter((w) => w.id !== session.id)]);
    // 后台静默推送到小主机私有云
    cloudSyncService.silentSyncOnSave(session);
  };


  const handleDeleteWorkout = async (id: string) => {
    await storageService.deleteWorkout(id);
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    // 后台静默通知小主机软删除
    cloudSyncService.silentSyncOnDelete(id);
  };

  const handleAddCustomExercise = async (ex: Exercise) => {
    await storageService.saveCustomExercise(ex);
    setCustomExercises((prev) => [...prev, ex]);
  };

  const handleDeleteCustomExercise = async (id: string) => {
    await storageService.deleteCustomExercise(id);
    setCustomExercises((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSaveTemplate = async (tmpl: WorkoutTemplate) => {
    await storageService.saveTemplate(tmpl);
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === tmpl.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = tmpl;
        return copy;
      }
      return [tmpl, ...prev];
    });
    cloudSyncService.silentSyncOnSaveTemplate(tmpl);
  };

  const handleDeleteTemplate = async (id: string) => {
    await storageService.deleteTemplate(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveBodyMetric = async (entry: BodyMetricEntry) => {
    await storageService.saveBodyMetric(entry);
    setBodyMetrics((prev) => {
      const filtered = prev.filter((m) => m.id !== entry.id && m.date !== entry.date);
      return [entry, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
    });
    cloudSyncService.silentSyncOnSaveBodyMetric(entry);
  };

  const handleDeleteBodyMetric = async (id: string) => {
    await storageService.deleteBodyMetric(id);
    setBodyMetrics((prev) => prev.filter((m) => m.id !== id));
  };

  const handleTogglePinExercise = (exerciseId: string) => {
    const updated = storageService.togglePinnedExercise(exerciseId);
    setPinnedExerciseIds(updated);
  };

  const handleCopyWorkoutToLogger = (session: WorkoutSession) => {
    setWorkoutToCopy(session);
    setActiveTab('logger');
  };

  const handleTriggerRestTimer = () => {
    setTimerKey(Date.now());
    setIsRestTimerActive(true);
  };

  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    const top = e.currentTarget.scrollTop;
    if (top > 320) {
      if (!showBackToTop) setShowBackToTop(true);
    } else {
      if (showBackToTop) setShowBackToTop(false);
    }
  };

  const scrollToTop = () => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset scroll position to top whenever switching main tabs, or restore for logger
  useEffect(() => {
    if (activeTab === 'logger') {
      mainContentRef.current?.scrollTo({ top: loggerScrollTopRef.current, behavior: 'instant' });
    } else {
      mainContentRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }
    setShowBackToTop(false);
  }, [activeTab]);

  return (
    <div className="app-viewport">
      <div className={`mobile-shell ${isWideMode ? 'wide-mode' : ''}`}>
        {/* Floating Toast Notification */}
        {bannerToast && (
          <div className="app-floating-toast animate-fade-in">
            <span>{bannerToast}</span>
          </div>
        )}

        {/* App Header */}
        <Header
          syncStatus={syncStatus}
          hasUpdate={Boolean(
            updateData?.hasUpdate && !updateService.isVersionIgnored(updateData.latestVersion)
          )}
          onNavigateToProfile={() => {
            setActiveTab('profile');
            setProfileSubPage(null);
          }}
          onOpenCloudModal={() => {
            setActiveTab('profile');
            setProfileSubPage('cloud');
          }}
        />

        {/* Main Body Content */}
        <main
          ref={mainContentRef}
          className="main-content smooth-scroll"
          onScroll={handleMainScroll}
        >
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              加载健身体系数据中...
            </div>
          ) : (
            <>
              {/* Keep WorkoutLogger mounted in DOM so tab switching NEVER destroys progress */}
              <div
                className="tab-pane-logger"
                style={{ display: activeTab === 'logger' ? 'block' : 'none' }}
              >
                <WorkoutLogger
                  customExercises={customExercises}
                  workouts={workouts}
                  pinnedExerciseIds={pinnedExerciseIds}
                  templates={templates}
                  onSaveTemplate={handleSaveTemplate}
                  onDeleteTemplate={handleDeleteTemplate}
                  workoutToCopy={workoutToCopy}
                  onClearWorkoutToCopy={() => setWorkoutToCopy(null)}
                  exerciseToAdd={exerciseToAdd}
                  onClearExerciseToAdd={() => setExerciseToAdd(null)}
                  onTogglePinExercise={handleTogglePinExercise}
                  onSaveWorkout={handleSaveWorkout}
                  onSetCompleted={handleTriggerRestTimer}
                  onDraftChange={setActiveDraft}
                />
              </div>

              {activeTab === 'history' && (
                <WorkoutHistory
                  workouts={workouts}
                  onDeleteWorkout={handleDeleteWorkout}
                  onCopyWorkoutToLogger={handleCopyWorkoutToLogger}
                />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsView
                  workouts={workouts}
                  customExercises={customExercises}
                  bodyMetrics={bodyMetrics}
                  onOpenBodyMetricsModal={() => {
                    setActiveTab('profile');
                    setProfileSubPage('metrics');
                  }}
                />
              )}

              {activeTab === 'exercises' && (
                <ExerciseLibrary
                  customExercises={customExercises}
                  workouts={workouts}
                  pinnedExerciseIds={pinnedExerciseIds}
                  onTogglePinExercise={handleTogglePinExercise}
                  onAddCustomExercise={handleAddCustomExercise}
                  onDeleteCustomExercise={handleDeleteCustomExercise}
                  onSelectExerciseToLog={(exercise) => {
                    setExerciseToAdd(exercise);
                    setActiveTab('logger');
                  }}
                />
              )}

              {activeTab === 'profile' && (
                <ProfileView
                  workouts={workouts}
                  templates={templates}
                  bodyMetrics={bodyMetrics}
                  customExercises={customExercises}
                  syncStatus={syncStatus}
                  themeState={themeState}
                  isWideMode={isWideMode}
                  onToggleWideMode={() => setIsWideMode(!isWideMode)}
                  onDataChanged={loadData}
                  onSaveBodyMetric={handleSaveBodyMetric}
                  onDeleteBodyMetric={handleDeleteBodyMetric}
                  hasUpdate={Boolean(
                    updateData?.hasUpdate && !updateService.isVersionIgnored(updateData.latestVersion)
                  )}
                  updateData={updateData}
                  isCheckingUpdate={isCheckingUpdate}
                  onCheckUpdate={() => handleCheckUpdate(true)}
                  initialSubPage={profileSubPage}
                  onSubPageChange={setProfileSubPage}
                />
              )}
            </>
          )}

          {/* Floating Back To Top Button */}
          <button
            type="button"
            className={`back-to-top-btn ${showBackToTop ? 'visible' : ''}`}
            onClick={scrollToTop}
            title="回到顶部"
            aria-label="回到顶部"
          >
            <ArrowUp size={18} />
          </button>
        </main>

        {/* Floating Rest Timer Bar when active */}
        {isRestTimerActive && (
          <RestTimer
            key={timerKey}
            initialSeconds={90}
            onClose={() => setIsRestTimerActive(false)}
          />
        )}

        {/* Floating Active Workout Pill Bar on non-logger tabs */}
        {activeTab !== 'logger' && isDraftActive && activeDraft && (
          <div
            className="active-workout-pill-bar animate-fade-in"
            onClick={() => setActiveTab('logger')}
            title="点击快速返回正在进行的训练"
          >
            <div className="active-pill-pulse-dot">
              <span className="pill-dot-ping" />
              <span className="pill-dot-core" />
            </div>
            <div className="active-pill-info">
              <span className="active-pill-title">{activeDraft.title || '训练进行中'}</span>
              <span className="active-pill-details">
                {activeDraftCompletedSets > 0
                  ? `${activeDraftCompletedSets} 组已打卡`
                  : `${activeDraft.exercises.length} 个动作`}
                {activeDraft.elapsedSeconds > 0 &&
                  ` · ${Math.floor(activeDraft.elapsedSeconds / 60)}分${(activeDraft.elapsedSeconds % 60).toString().padStart(2, '0')}秒`}
              </span>
            </div>
            <div className="active-pill-action">
              <span>返回训练</span>
              <ChevronRight size={14} />
            </div>
          </div>
        )}

        {/* Bottom Tab Navigation */}
        <Navbar
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (activeTab === 'logger') {
              loggerScrollTopRef.current = mainContentRef.current?.scrollTop || 0;
            }
            setActiveTab(tab);
            if (tab !== 'profile') {
              setProfileSubPage(null);
            }
          }}
          hasUpdate={Boolean(
            updateData?.hasUpdate && !updateService.isVersionIgnored(updateData.latestVersion)
          )}
          hasActiveWorkout={isDraftActive}
          isHidden={Boolean(profileSubPage)}
        />

        {/* Local Storage & Backup Modal */}
        <DataBackupModal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
          onDataChanged={loadData}
        />

        {/* Technical Architecture Document Modal */}
        <TechDocsModal
          isOpen={isTechDocsModalOpen}
          onClose={() => setIsTechDocsModalOpen(false)}
        />

        {/* Private Cloud / J1900 Sync Modal */}
        <CloudSyncModal
          isOpen={isCloudModalOpen}
          onClose={() => setIsCloudModalOpen(false)}
          onDataChanged={loadData}
        />

        {/* Application Update Modal */}
        <UpdateModal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          updateData={updateData}
          isChecking={isCheckingUpdate}
          onRefreshCheck={() => handleCheckUpdate(true)}
        />

        {/* Personalized Theme & Skin Modal */}
        <ThemeModal
          isOpen={isThemeModalOpen}
          onClose={() => setIsThemeModalOpen(false)}
        />

        {/* Body Metrics Tracking Modal */}
        <BodyMetricsModal
          isOpen={isBodyMetricsModalOpen}
          onClose={() => setIsBodyMetricsModalOpen(false)}
          bodyMetrics={bodyMetrics}
          onSaveMetric={handleSaveBodyMetric}
          onDeleteMetric={handleDeleteBodyMetric}
        />

        {/* Unsettled/Next-day Workout Recovery Modal */}
        <UnsettledWorkoutModal
          isOpen={isUnsettledModalOpen}
          draft={unsettledDraft}
          onRecoverAsHistorical={handleRecoverAsHistorical}
          onContinueWorkout={handleContinueUnsettledWorkout}
          onDiscardDraft={handleDiscardUnsettledDraft}
          onClose={() => setIsUnsettledModalOpen(false)}
        />
      </div>
    </div>
  );

}

export default App;

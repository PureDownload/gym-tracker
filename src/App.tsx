import { useState, useEffect } from 'react';
import type { WorkoutSession, Exercise } from './types/workout';
import type { UpdateCheckResult } from './types/update';
import { storageService } from './services/storage';
import { updateService } from './services/updateService';
import { Header } from './components/Header';
import { Navbar, type TabType } from './components/Navbar';
import { WorkoutLogger } from './components/WorkoutLogger';
import { TrainingCalendar } from './components/TrainingCalendar';
import { WorkoutHistory } from './components/WorkoutHistory';
import { AnalyticsView } from './components/AnalyticsView';
import { ExerciseLibrary } from './components/ExerciseLibrary';
import { RestTimer } from './components/RestTimer';
import { DataBackupModal } from './components/DataBackupModal';
import { TechDocsModal } from './components/TechDocsModal';
import { UpdateModal } from './components/UpdateModal';
import './styles/base.css';
import './styles/app.css';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('logger');
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [pinnedExerciseIds, setPinnedExerciseIds] = useState<string[]>([]);
  const [workoutToCopy, setWorkoutToCopy] = useState<WorkoutSession | null>(null);

  const [isWideMode, setIsWideMode] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [isTechDocsModalOpen, setIsTechDocsModalOpen] = useState<boolean>(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [updateData, setUpdateData] = useState<UpdateCheckResult | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [isRestTimerActive, setIsRestTimerActive] = useState<boolean>(false);
  const [timerKey, setTimerKey] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const loadedWorkouts = await storageService.getWorkouts();
      const loadedCustom = await storageService.getCustomExercises();
      const loadedPinned = storageService.getPinnedExerciseIds();
      setWorkouts(loadedWorkouts);
      setCustomExercises(loadedCustom);
      setPinnedExerciseIds(loadedPinned);
    } catch (e) {
      console.error('Failed to load initial data', e);
    } finally {
      setIsLoading(false);
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
    loadData();
    // 启动时后台静默预检更新（非阻塞）
    updateService
      .checkForUpdates(false)
      .then((res) => setUpdateData(res))
      .catch(() => {});
  }, []);

  const handleSaveWorkout = async (session: WorkoutSession) => {
    await storageService.saveWorkout(session);
    setWorkouts((prev) => [session, ...prev.filter((w) => w.id !== session.id)]);
  };

  const handleDeleteWorkout = async (id: string) => {
    await storageService.deleteWorkout(id);
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  };

  const handleAddCustomExercise = async (ex: Exercise) => {
    await storageService.saveCustomExercise(ex);
    setCustomExercises((prev) => [...prev, ex]);
  };

  const handleDeleteCustomExercise = async (id: string) => {
    await storageService.deleteCustomExercise(id);
    setCustomExercises((prev) => prev.filter((e) => e.id !== id));
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

  return (
    <div className="app-viewport">
      <div className={`mobile-shell ${isWideMode ? 'wide-mode' : ''}`}>
        {/* App Header */}
        <Header
          isWideMode={isWideMode}
          onToggleWideMode={() => setIsWideMode(!isWideMode)}
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
          onOpenTechDocsModal={() => setIsTechDocsModalOpen(true)}
          onOpenUpdateModal={() => {
            setIsUpdateModalOpen(true);
            if (!updateData || updateData.error) {
              handleCheckUpdate(true);
            }
          }}
          hasUpdate={Boolean(
            updateData?.hasUpdate && !updateService.isVersionIgnored(updateData.latestVersion)
          )}
        />

        {/* Main Body Content */}
        <main className="main-content">
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              加载健身体系数据中...
            </div>
          ) : (
            <>
              {activeTab === 'logger' && (
                <WorkoutLogger
                  customExercises={customExercises}
                  workouts={workouts}
                  pinnedExerciseIds={pinnedExerciseIds}
                  workoutToCopy={workoutToCopy}
                  onClearWorkoutToCopy={() => setWorkoutToCopy(null)}
                  onTogglePinExercise={handleTogglePinExercise}
                  onSaveWorkout={handleSaveWorkout}
                  onSetCompleted={handleTriggerRestTimer}
                />
              )}

              {activeTab === 'calendar' && (
                <TrainingCalendar
                  workouts={workouts}
                  onCopyWorkoutToLogger={handleCopyWorkoutToLogger}
                />
              )}

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
                />
              )}
            </>
          )}
        </main>

        {/* Floating Rest Timer Bar when active */}
        {isRestTimerActive && (
          <RestTimer
            key={timerKey}
            initialSeconds={90}
            onClose={() => setIsRestTimerActive(false)}
          />
        )}

        {/* Bottom Tab Navigation */}
        <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

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

        {/* Application Update Modal */}
        <UpdateModal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          updateData={updateData}
          isChecking={isCheckingUpdate}
          onRefreshCheck={() => handleCheckUpdate(true)}
        />
      </div>
    </div>
  );
}

export default App;

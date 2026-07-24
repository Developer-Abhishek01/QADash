import { configureStore } from '@reduxjs/toolkit';

import authSlice from './slices/authSlice';
import executionSlice from './slices/executionSlice';
import notificationSlice from './slices/notificationSlice';
import projectSlice from './slices/projectSlice';
import uiSlice from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    ui: uiSlice,
    notifications: notificationSlice,
    projects: projectSlice,
    executions: executionSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
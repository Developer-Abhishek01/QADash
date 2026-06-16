import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ThemeMode = 'light' | 'dark' | 'system';

export interface UIState {
  themeMode: ThemeMode;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  breadcrumbs: { label: string; href?: string }[];
  globalLoading: boolean;
  commandPaletteOpen: boolean;
}

const initialState: UIState = {
  themeMode: 'system',
  sidebarOpen: true,
  sidebarCollapsed: false,
  breadcrumbs: [],
  globalLoading: false,
  commandPaletteOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      state.themeMode = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleSidebarCollapsed: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setBreadcrumbs: (state, action: PayloadAction<{ label: string; href?: string }[]>) => {
      state.breadcrumbs = action.payload;
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.globalLoading = action.payload;
    },
    toggleCommandPalette: (state) => {
      state.commandPaletteOpen = !state.commandPaletteOpen;
    },
    setCommandPaletteOpen: (state, action: PayloadAction<boolean>) => {
      state.commandPaletteOpen = action.payload;
    },
  },
});

export const {
  setThemeMode,
  toggleSidebar,
  setSidebarOpen,
  toggleSidebarCollapsed,
  setBreadcrumbs,
  setGlobalLoading,
  toggleCommandPalette,
  setCommandPaletteOpen,
} = uiSlice.actions;
export default uiSlice.reducer;
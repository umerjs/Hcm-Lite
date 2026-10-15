import { create } from "zustand";

export interface User {
  _id?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  username?: string;
  profileimg?: string;
}

interface StoreState {
  user: User | null;
  isLogin: boolean | null;

  setUser: (userData: User) => void;
  login: (userData: User) => void;
  logout: () => void;
}

export const store = create<StoreState>((set) => ({
  user: null,

  isLogin: null,

  setUser: (userData) => {
    set({
      user: userData,
    });
  },

  login: (userData) => {
    set({
      user: userData,
      isLogin: true,
    });
  },

  logout: () => {
    localStorage.removeItem("token");

    set({
      user: null,
      isLogin: false,
    });
  },
}));

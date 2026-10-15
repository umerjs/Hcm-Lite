import { useState } from "react";
import { FiBarChart2, FiLogOut } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";

import Button from "./Button";
import { store } from "../store/states";

const Navbar = () => {
  const { user, logout } = store();
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  const profileImg = user?.profileimg;
  const initial = user?.firstname?.charAt(0).toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white">
            <FiBarChart2 className="h-5 w-5" />
          </span>

         <Link to="/">
             <span className="text-lg font-bold text-gray-800">MERN Template</span>
          </Link>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* User Profile */}
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1.5 pl-1.5 pr-4 hover:bg-gray-50 cursor-pointer"
          >
            {/* Avatar Container */}
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-bold text-blue-600">
              {profileImg && !imageError ? (
                <img
                  src={profileImg}
                  alt={user?.firstname || "User"}
                  onError={() => setImageError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initial}</span>
              )}
            </span>

            {/* Firstname + Lastname */}
            <div className="flex flex-col text-left">
              <span className="font-semibold text-gray-800">
                {user?.firstname} {user?.lastname}
              </span>

              {user?.username && (
                <span className="text-xs text-blue-500">@{user.username}</span>
              )}
            </div>
          </button>

          {/* Logout */}
          <Button
            type="button"
            onClick={logout}
            className="flex h-10 w-auto items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-white hover:bg-red-700 cursor-pointer"
          >
            <FiLogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

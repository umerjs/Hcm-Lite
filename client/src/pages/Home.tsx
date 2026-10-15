import Navbar from "../components/Navbar";
import { store } from "../store/states";
import { FiCheckCircle, FiShield, FiUser, FiCpu } from "react-icons/fi";

const Home = () => {
  const { user } = store();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {/* Hero Section */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 p-8 sm:p-12 text-white shadow-xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Welcome back, {user?.firstname} {user?.lastname}! 👋
          </h1>
          <p className="mt-4 text-blue-100 max-w-2xl text-base sm:text-lg">
            You are successfully logged in to the MERN Starter Template. This repository comes pre-configured with secure JWT authentication, Cloudinary avatar uploads, password management, and Tailwind CSS.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-4">
              <FiShield className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Secure Authentication</h2>
            <p className="mt-2 text-sm text-gray-600">
              Complete JWT-based signup, login, auth guards, and password hashing with bcrypt.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-4">
              <FiUser className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Profile & Avatars</h2>
            <p className="mt-2 text-sm text-gray-600">
              Manage user profile details, update usernames, and upload avatars directly to Cloudinary.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-4">
              <FiCpu className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Modern Tech Stack</h2>
            <p className="mt-2 text-sm text-gray-600">
              Built with Express, MongoDB/Mongoose, React 19, TypeScript, Tailwind CSS, and Bun.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;

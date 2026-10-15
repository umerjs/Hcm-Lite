import { useState } from "react";
import PasswordInput from "../components/PasswordInput";
import Input from "../components/Input";
import Button from "../components/Button";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { BackendUrl } from "../core";
import { store } from "../store/states";

const Signup = () => {
  const { login } = store();
  const navigate = useNavigate();

  const [firstname, setFirstname] = useState<string>("");
  const [lastname, setLastname] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [repPassword, setRepPassword] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!firstname.trim()) {
      alert("Firstname is required");
      return;
    }

    if (!lastname.trim()) {
      alert("Lastname is required");
      return;
    }

    if (!username.trim()) {
      alert("Username is required");
      return;
    }

    if (!email.trim()) {
      alert("Email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      alert("Enter a valid email address");
      return;
    }

    if (!password) {
      alert("Password is required");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    if (password !== repPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const response = await axios.post(`${BackendUrl}/api/v1/auth/signup`, {
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      });

      alert("Signup Done");
      localStorage.setItem("token", response.data.token);
      login(response.data.user);
      navigate("/");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.message || "Signup failed");
      } else {
        alert("Something went wrong");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Create an account
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Sign up to get started with your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                placeholder="Enter firstname"
                label="Firstname"
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
              />

              <Input
                placeholder="Enter lastname"
                label="Lastname"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
              />
            </div>

            <Input
              placeholder="Enter username"
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <Input
              placeholder="Enter email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <PasswordInput
              placeholder="Enter password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <PasswordInput
              placeholder="Confirm password"
              label="Confirm password"
              value={repPassword}
              onChange={(e) => setRepPassword(e.target.value)}
            />

            <Button className="bg-blue-500 rounded-sm w-full h-10 flex justify-center items-center text-white cursor-pointer hover:bg-blue-600">
              Signup
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-6 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                className="font-medium text-blue-600 transition-colors hover:text-blue-700"
                to="/login"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;

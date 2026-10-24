import { useState, useEffect } from "react";
import axios from "axios";
import Input from "../components/Input";
import Button from "../components/Button";
import Navbar from "../components/Navbar";
import ProfileInfoItem from "../components/ProfileInfoItem";
import { BackendUrl } from "../core";
import { store, type User } from "../store/states";
import { useParams, useNavigate } from "react-router-dom";
import { CiEdit } from "react-icons/ci";

const Profile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { setUser, user } = store();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const isOwnProfile = !userId || (!!profileUser && profileUser._id === user?._id);
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    getProfile();
    setEditing(false);
  }, [userId]);

  const handleCancel = () => {
    if (profileUser) {
      setFirstname(profileUser.firstname || "");
      setLastname(profileUser.lastname || "");
      setUsername(profileUser.username || "");
    }
    setEditing(false);
  };

  const getProfile = async () => {
    setProfileLoading(true);
    try {
      const endpoint = userId
        ? `${BackendUrl}/api/v1/profile/${userId}`
        : `${BackendUrl}/api/v1/profile`;

      const response = await axios.get(endpoint, {
        headers: { authorizedtoken: localStorage.getItem("token") },
      });

      const profileData: User = response.data.data;

      if (userId && user?._id === profileData._id) {
        navigate("/profile", { replace: true });
        return;
      }

      setProfileUser(profileData);
      setFirstname(profileData.firstname || "");
      setLastname(profileData.lastname || "");
      setUsername(profileData.username || "");

      if (!userId) {
        setUser(profileData);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firstname.trim()) return alert("Firstname is required");
    if (!lastname.trim()) return alert("Lastname is required");
    if (!username.trim()) return alert("Username is required");

    setLoading(true);
    try {
      const response = await axios.put(
        `${BackendUrl}/api/v1/profile`,
        {
          firstname: firstname.trim(),
          lastname: lastname.trim(),
          username: username.trim(),
        },
        { headers: { authorizedtoken: localStorage.getItem("token") } },
      );
      const updatedUser: User = response.data.data;
      setProfileUser(updatedUser);
      setUser(updatedUser);
      setEditing(false);
      alert("Profile updated successfully");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.message || "Update failed");
      } else {
        alert("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      e.target.value = "";
      return;
    }

    if (file.size > 2_000_000) {
      alert("Image must be smaller than 2 MB");
      e.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);
    setAvatarLoading(true);

    try {
      const response = await axios.put(`${BackendUrl}/api/v1/profile/avatar`, formData, {
        headers: { authorizedtoken: localStorage.getItem("token") },
      });
      const updatedUser: User = response.data.data;
      setProfileUser(updatedUser);
      setUser(updatedUser);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.message || "Avatar upload failed");
      } else {
        alert("Avatar upload failed");
      }
    } finally {
      setAvatarLoading(false);
      e.target.value = "";
    }
  };

  const initial = profileUser?.firstname?.charAt(0).toUpperCase() || "?";

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-md w-full">
          <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-200">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                {editing && isOwnProfile
                  ? "Edit Profile"
                  : isOwnProfile
                    ? "My Profile"
                    : "User Profile"}
              </h1>
              <p className="text-sm text-slate-500">
                {editing && isOwnProfile
                  ? "Update your personal information."
                  : isOwnProfile
                    ? "Manage your account details."
                    : "View this user's profile."}
              </p>
            </div>

            {/* Avatar */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-lg flex items-center justify-center bg-blue-600">
                  {profileLoading ? (
                    <div className="h-6 w-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                  ) : profileUser?.profileimg ? (
                    <img
                      src={profileUser.profileimg}
                      alt="Profile"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-white font-bold text-3xl uppercase">{initial}</span>
                  )}
                </div>

                {isOwnProfile && (
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 cursor-pointer bg-blue-600 hover:bg-blue-700 p-2 rounded-full shadow-lg transition"
                  >
                    {avatarLoading ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CiEdit className="h-4 w-4 text-white" />
                    )}
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                      disabled={avatarLoading}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Content */}
            {profileLoading ? (
              <div className="space-y-4">
                <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              </div>
            ) : editing && isOwnProfile ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="flex gap-3 mt-4">
                  <Button
                    type="button"
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-slate-700 font-semibold rounded-xl py-3 transition"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 transition"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ProfileInfoItem label="Firstname" value={profileUser?.firstname || "-"} />
                  <ProfileInfoItem label="Lastname" value={profileUser?.lastname || "-"} />
                </div>
                <ProfileInfoItem label="Username" value={`@${profileUser?.username || "-"}`} />
                <ProfileInfoItem label="Email" value={profileUser?.email || "-"} />
                {isOwnProfile && (
                  <Button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 transition"
                  >
                    <CiEdit className="inline-block mr-2 h-5 w-5" />
                    Update Profile
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;

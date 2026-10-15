import { useRef, type FormEvent } from "react";
import axios from "axios";
import { BackendUrl } from "../core";

interface FormProps {
  getallposts: () => void;
}

const Form = ({ getallposts }: FormProps) => {
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const postImageRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const title = titleRef.current?.value.trim();
    const description = descriptionRef.current?.value.trim();
    const file = postImageRef.current?.files?.[0];

    if (!title || !description) {
      alert("Please fill in both title and description.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    if (file) {
      formData.append("postImage", file);
    }

    try {
      await axios.post(`${BackendUrl}/api/v1/post`, formData, {
        headers: {
          authorizedtoken: localStorage.getItem("token"),
        },
      });

      getallposts();
      form.reset();
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  return (
    <div className="flex items-center justify-center bg-gray-100 px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl"
      >
        <h2 className="mb-6 text-center text-3xl font-bold text-gray-800">
          Create Post
        </h2>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            ref={titleRef}
            type="text"
            placeholder="Enter title"
            autoFocus
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="file-upload"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 cursor-pointer flex justify-center bg-amber-500 text-amber-100 hover:bg-amber-600"
          >
            Post Image (optional)
          </label>
          <input
            ref={postImageRef}
            style={{ display: "none" }}
            type="file"
            id="file-upload"
            accept="image/*"
          />
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            ref={descriptionRef}
            placeholder="Enter Your description here..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={4}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 active:scale-95"
        >
          Create Post
        </button>
      </form>
    </div>
  );
};

export default Form;

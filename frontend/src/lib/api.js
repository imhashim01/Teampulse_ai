import axios from "axios";

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL}/api`,
  withCredentials: true,
});

export const errMsg = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message || error?.message || fallback;

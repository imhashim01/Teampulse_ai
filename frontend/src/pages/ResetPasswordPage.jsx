import { useState } from "react";
import { motion } from "framer-motion";
import { Logo } from '../components/ui';
import { useAuthStore } from "../store/authStore";
import { useNavigate, useParams } from "react-router-dom";
import Input from "../components/Input";
import { Lock } from "lucide-react";
import toast from "react-hot-toast";

const ResetPasswordPage = () => {
    	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const { resetPassword, error, isLoading, message } = useAuthStore();

	const { token } = useParams();
	const navigate = useNavigate();

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (password !== confirmPassword) {
			alert("Passwords do not match");
			return;
		}
		try {
			await resetPassword(token, password);

			toast.success("Password reset successfully, redirecting to login page...");
			setTimeout(() => {
				navigate("/login");
			}, 2000);
		} catch (error) {
			console.error(error);
			toast.error(error.message || "Error resetting password");
		}
	};

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className='max-w-md w-full card overflow-hidden'
        >
            <div className='p-8'>
        <Logo className='justify-center mb-6' />
                <h2 className='text-xl font-semibold mb-1 text-center text-ink'>
                    Reset Password
                </h2>
                {error && <p className='text-red-600 text-sm mb-4'>{error}</p>}
                {message && <p className='text-accent text-sm mb-4'>{message}</p>}

                <form onSubmit={handleSubmit}>
                    <Input
                        icon={Lock}
                        type='password'
                        placeholder='New Password'
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <Input
                        icon={Lock}
                        type='password'
                        placeholder='Confirm New Password'
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className='btn-primary w-full py-2.5 mt-2'
                        type='submit'
                        disabled={isLoading}
                    >
                        {isLoading ? "Resetting..." : "Set New Password"}
                    </motion.button>
                </form>
            </div>
        </motion.div>
    );
};
export default ResetPasswordPage;
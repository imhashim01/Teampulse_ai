import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import { useState } from "react";
import axios from "axios";
import { ChartBarIcon, UserGroupIcon, CurrencyDollarIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

// Demo data
const companyData = {
  name: "Tech Innovations Ltd",
  founded: "2018",
  description: "Leading provider of AI-powered solutions for enterprise businesses. Specializing in machine learning, cloud computing, and data analytics.",
  achievements: [
    { title: "Users Reached", value: "1M+" },
    { title: "Annual Revenue", value: "$50M" },
    { title: "Projects Completed", value: "250+" },
  ],
  team: [
    { name: "John Doe", role: "CEO", avatar: "https://example.com/avatar1.jpg" },
    { name: "Jane Smith", role: "CTO", avatar: "https://example.com/avatar2.jpg" },
    { name: "Mike Johnson", role: "Lead Developer", avatar: "https://example.com/avatar3.jpg" },
    { name: "Sarah Wilson", role: "Marketing Head", avatar: "https://example.com/avatar4.jpg" },
  ],
  progress: [
    { year: '2018', revenue: 5, users: 50 },
    { year: '2019', revenue: 15, users: 250 },
    { year: '2020', revenue: 30, users: 800 },
    { year: '2021', revenue: 45, users: 1500 },
    { year: '2022', revenue: 50, users: 2000 },
  ],
  targets: [
    { title: "Annual Revenue", value: "$50M", icon: CurrencyDollarIcon },
    { title: "Active Users", value: "2M+", icon: UserGroupIcon },
    { title: "Projects Completed", value: "300+", icon: ChartBarIcon },
    { title: "Client Satisfaction", value: "98%", icon: CheckBadgeIcon },
  ]

};

const ProgressChart = () => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={companyData.progress}>
      <CartesianGrid strokeDasharray="3 3" stroke="#2d3955" />
      <XAxis 
        dataKey="year" 
        stroke="#7d98d1" 
        tick={{ fill: '#a0aec0' }}
      />
      <YAxis 
        stroke="#7d98d1" 
        tick={{ fill: '#a0aec0' }}
        tickFormatter={(value) => `$${value}M`}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: '#1f2d47',
          border: '1px solid #282354',
          borderRadius: '8px',
        }}
      />
      <Line 
        type="monotone" 
        dataKey="revenue" 
        stroke="#7d98d1" 
        strokeWidth={2}
        dot={{ fill: '#282354', strokeWidth: 2 }}
      />
      <Line 
        type="monotone" 
        dataKey="users" 
        stroke="#82ca9d" 
        strokeWidth={2}
        dot={{ fill: '#282354', strokeWidth: 2 }}
      />
    </LineChart>
  </ResponsiveContainer>
);

const ProfilePage = () => {
  const { user } = useAuthStore();
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    if (file) {
      setFileUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
  
    const formData = new FormData();
    formData.append("profilePicture", selectedFile);
  
    try {
      const res = await axios.put(
        "http://localhost:5000/api/user/update-profile-picture",
        formData,
        {
          headers: { 
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true
        }
      );
      
      setFileUrl(res.data.user.profilePicture);
      setSelectedFile(null);
      
    } catch (err) {
      console.error("Upload error:", err);
      alert(err.response?.data?.message || "Failed to update profile picture");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full min-h-screen bg-[#172542] pt-20"
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-[#7d98d1] to-[#282354] text-transparent bg-clip-text">
          Company Profile
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
          {/* Left Column */}
          <div className="space-y-6 w-full">
            <motion.div
              className="p-6 bg-[#1f2d47] rounded-xl border border-[#282354] mx-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex flex-col items-center">
                <div className="relative group mb-4">
                  <img
                    src={fileUrl || user.profilePicture || "https://res.cloudinary.com/df5q2q5/image/upload/v1710761735/default-profile-picture.png"}
                    alt="Profile"
                    className="w-40 h-40 rounded-full object-cover border-4 border-[#282354]"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <label className="cursor-pointer text-[#7d98d1] hover:underline">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      {selectedFile ? "Save Changes" : "Edit"}
                    </label>
                  </div>
                </div>

                {selectedFile && (
                  <div className="flex gap-4 mt-4 justify-center">
                    <button
                      onClick={handleUpload}
                      className="px-4 py-2 bg-gradient-to-r from-[#7d98d1] to-[#282354] text-white font-bold rounded-lg hover:from-[#282354] hover:to-[#7d98d1]"
                    >
                      Upload
                    </button>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="px-4 py-2 border border-[#7d98d1] text-[#7d98d1] rounded-lg hover:bg-[#7d98d1] hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <div className="mt-8 w-full">
                  <h3 className="text-2xl font-bold text-[#7d98d1] mb-4">Personal Details</h3>
                  <div className="space-y-3">
                    <p className="text-gray-300">
                      <span className="font-bold text-[#7d98d1]">Name:</span> {user.name}
                    </p>
                    <p className="text-gray-300">
                      <span className="font-bold text-[#7d98d1]">Email:</span> {user.email}
                    </p>
                    <p className="text-gray-300">
                      <span className="font-bold text-[#7d98d1]">Position:</span> Senior Developer
                    </p>
                    <p className="text-gray-300">
                      <span className="font-bold text-[#7d98d1]">Department:</span> Engineering
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="p-6 bg-[#1f2d47] rounded-xl border border-[#282354] mx-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-2xl font-bold text-[#7d98d1] mb-6">Company Milestones</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                {companyData.achievements.map((achievement, index) => (
                  <div key={index} className="p-4 bg-[#172542] rounded-lg text-center w-full">
                    <p className="text-[#7d98d1] font-bold text-xl mb-2">{achievement.value}</p>
                    <p className="text-gray-300 text-sm">{achievement.title}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-6 w-full">
            <motion.div
              className="p-6 bg-[#1f2d47] rounded-xl border border-[#282354] mx-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-2xl font-bold text-[#7d98d1] mb-6">Company Overview</h3>
              <p className="text-gray-300 mb-6 leading-relaxed">
                {companyData.description}
              </p>
              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="p-4 bg-[#172542] rounded-lg">
                  <p className="text-[#7d98d1] font-bold mb-2">Founded</p>
                  <p className="text-gray-300">{companyData.founded}</p>
                </div>
                <div className="p-4 bg-[#172542] rounded-lg">
                  <p className="text-[#7d98d1] font-bold mb-2">Industry</p>
                  <p className="text-gray-300">Technology</p>
                </div>
                <div className="p-4 bg-[#172542] rounded-lg">
                  <p className="text-[#7d98d1] font-bold mb-2">Location</p>
                  <p className="text-gray-300">San Francisco, CA</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="p-6 bg-[#1f2d47] rounded-xl border border-[#282354] mx-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-2xl font-bold text-[#7d98d1] mb-6">Team Members</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {companyData.team.map((member, index) => (
                  <div key={index} className="flex items-center p-4 bg-[#172542] rounded-lg hover:bg-[#282354] transition-colors w-full">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-14 h-14 rounded-full object-cover mr-4 border-2 border-[#7d98d1]"
                    />
                    <div>
                      <p className="text-[#7d98d1] font-semibold">{member.name}</p>
                      <p className="text-gray-300 text-sm">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
          
          
        </div>

        <motion.div
          className="p-6 bg-[#1f2d47] rounded-xl border border-[#282354] mx-0 mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-2xl font-bold text-[#7d98d1] mb-6">Growth & Achievements</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h4 className="text-xl font-semibold text-[#7d98d1]">Annual Progress</h4>
              <div className="h-64 sm:h-80">
                <ProgressChart />
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-xl font-semibold text-[#7d98d1]">Key Targets Achieved</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {companyData.targets.map((target, index) => (
                  <div 
                    key={index}
                    className="p-4 bg-[#172542] rounded-lg flex items-center space-x-4 hover:bg-[#282354] transition-colors"
                  >
                    <target.icon className="h-8 w-8 text-[#7d98d1]" />
                    <div>
                      <p className="text-[#7d98d1] font-semibold">{target.value}</p>
                      <p className="text-gray-300 text-sm">{target.title}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-4 bg-[#172542] rounded-lg">
                <h5 className="text-lg font-semibold text-[#7d98d1] mb-3">Recent Milestones</h5>
                <ul className="space-y-2 text-gray-300">
                  <li>• Reached 2M+ active users in 2023</li>
                  <li>• Expanded to 3 new countries</li>
                  <li>• Launched AI-powered analytics suite</li>
                  <li>• Achieved ISO 27001 certification</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>


      </div>

    </motion.div>
  );
};

export default ProfilePage;
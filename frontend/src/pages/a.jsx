// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
// import { motion } from "framer-motion";
// import { useAuthStore } from "../store/authStore";
// import { useState, useEffect } from "react";
// import axios from "axios";
// import { ChartBarIcon, UserGroupIcon, CurrencyDollarIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

// const iconComponents = {
//   CurrencyDollarIcon,
//   UserGroupIcon,
//   ChartBarIcon,
//   CheckBadgeIcon
// };

// const ProgressChart = ({ data }) => (
//   <ResponsiveContainer width="100%" height={300}>
//     <LineChart data={data}>
//       <CartesianGrid strokeDasharray="3 3" stroke="#2d3955" />
//       <XAxis 
//         dataKey="year" 
//         stroke="#7d98d1" 
//         tick={{ fill: '#a0aec0' }}
//       />
//       <YAxis 
//         stroke="#7d98d1" 
//         tick={{ fill: '#a0aec0' }}
//         tickFormatter={(value) => `$${value}M`}
//       />
//       <Tooltip
//         contentStyle={{
//           backgroundColor: '#1f2d47',
//           border: '1px solid #282354',
//           borderRadius: '8px',
//         }}
//       />
//       <Line 
//         type="monotone" 
//         dataKey="revenue" 
//         stroke="#7d98d1" 
//         strokeWidth={2}
//         dot={{ fill: '#282354', strokeWidth: 2 }}
//       />
//       <Line 
//         type="monotone" 
//         dataKey="users" 
//         stroke="#82ca9d" 
//         strokeWidth={2}
//         dot={{ fill: '#282354', strokeWidth: 2 }}
//       />
//     </LineChart>
//   </ResponsiveContainer>
// );


// const ProfilePage = () => {
//     const { user, fetchCompanyData, updateCompanyData } = useAuthStore();
//     const [selectedFile, setSelectedFile] = useState(null);
//     const [fileUrl, setFileUrl] = useState(null);
//     const [companyData, setCompanyData] = useState(null); // Changed initial state to null
//     const [editMode, setEditMode] = useState({
//       overview: false,
//       milestones: false,
//       team: false,
//       progress: false,
//       targets: false
//     });


//   useEffect(() => {
//     const loadCompanyData = async () => {
//       const data = await fetchCompanyData();
//       setCompanyData(data || null);
//     };
//     loadCompanyData();
//   }, []);


//   const handleCompanyUpdate = async (updatedData) => {
//     try {
//       const newData = await updateCompanyData({
//         ...companyData,
//         ...updatedData
//       });
//       setCompanyData(newData);
//       // Exit edit mode after save
//       setEditMode({ ...editMode, [Object.keys(updatedData)[0]]: false });
//     } catch (error) {
//       console.error("Update failed:", error);
//     }
//   };

//   const initializeCompanyData = async () => {
//     const baseStructure = {
//       name: "New Company",
//       founded: new Date().getFullYear().toString(),
//       description: "",
//       industry: "",
//       location: "",
//       achievements: [],
//       team: [],
//       progress: [],
//       targets: []
//     };
    
//     try {
//       const newData = await updateCompanyData(baseStructure);
//       setCompanyData(newData);
//     } catch (error) {
//       console.error("Initialization failed:", error);
//       alert("Failed to initialize company profile");
//     }
//   };

//   const handleFileChange = (event) => {
//     const file = event.target.files[0];
//     setSelectedFile(file);
//     if (file) {
//       setFileUrl(URL.createObjectURL(file));
//     }
//   };

//   const handleUpload = async (e) => {
//     e.preventDefault();
//     if (!selectedFile) return;
  
//     const formData = new FormData();
//     formData.append("profilePicture", selectedFile);
  
//     try {
//       const res = await axios.put(
//         "http://localhost:5000/api/user/update-profile-picture",
//         formData,
//         {
//           headers: { 
//             "Content-Type": "multipart/form-data",
//           },
//           withCredentials: true
//         }
//       );
      
//       setFileUrl(res.data.user.profilePicture);
//       setSelectedFile(null);
      
//     } catch (err) {
//       console.error("Upload error:", err);
//       alert(err.response?.data?.message || "Failed to update profile picture");
//     }
//   };

//     // Edit toggle function
//     const toggleEditMode = (section) => {
//       setEditMode(prev => ({ ...prev, [section]: !prev[section] }));
//     };

//       // Handle array updates (achievements, team, progress, targets)
//   const handleArrayUpdate = (section, index, field, value) => {
//     const updatedArray = [...companyData[section]];
//     updatedArray[index][field] = value;
//     setCompanyData(prev => ({ ...prev, [section]: updatedArray }));
//   };

//   // Add new entry to array
//   const addArrayEntry = (section, template) => {
//     setCompanyData(prev => ({
//       ...prev,
//       [section]: [...prev[section], template]
//     }));
//   };

//   // Remove entry from array
//   const removeArrayEntry = (section, index) => {
//     const updatedArray = companyData[section].filter((_, i) => i !== index);
//     setCompanyData(prev => ({ ...prev, [section]: updatedArray }));
//   };

//     // Add Progress Year Entry
//     const addProgressYear = () => {
//       const newYear = {
//         year: new Date().getFullYear(),
//         revenue: 0,
//         users: 0
//       };
//       setCompanyData(prev => ({
//         ...prev,
//         progress: [...prev.progress, newYear]
//       }));
//     };
  
//     // Handle Progress Updates
//     const handleProgressUpdate = (index, field, value) => {
//       const updatedProgress = [...companyData.progress];
//       updatedProgress[index][field] = field === 'year' ? value : Number(value);
//       setCompanyData(prev => ({ ...prev, progress: updatedProgress }));
//     };
  
//     // Handle Target Icon Selection
//     const handleIconChange = (index, iconName) => {
//       const updatedTargets = [...companyData.targets];
//       updatedTargets[index].icon = iconName;
//       setCompanyData(prev => ({ ...prev, targets: updatedTargets }));
//     };
//  return (
//     <motion.div
//       initial={{ opacity: 0, y: 20 }}
//       animate={{ opacity: 1, y: 0 }}
//       className="w-full min-h-screen bg-[#172542] pt-20"
//     >
//       <div className="w-full px-4 sm:px-6 lg:px-8 mx-auto">
//       <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-[#7d98d1] to-[#282354] text-transparent bg-clip-text">
//     {companyData.name || "Company Profile"}
//   </h2>

//   {companyData === null && (
//   <div className="text-center mb-8">
//     <button 
//       onClick={initializeCompanyData}
//       className="px-6 py-3 bg-[#7d98d1] text-white rounded-lg hover:bg-[#282354] transition-colors"
//     >
//       Initialize Company Profile
//     </button>
//   </div>
// )}

//         {companyData && companyData.name && (
//           <>
//             {/* Main Content Grid */}
//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
              
//             <motion.div className="p-6 bg-[#1f2d47] rounded-xl border border-[#282354]">
//           <div className="flex justify-between items-center mb-6">
//             <h3 className="text-2xl font-bold text-[#7d98d1]">Company Overview</h3>
//             <button
//               onClick={() => toggleEditMode('overview')}
//               className="text-[#7d98d1] hover:text-white"
//             >
//               {editMode.overview ? 'Cancel' : 'Edit'}
//             </button>
//           </div>

//           {editMode.overview ? (
//             <div className="space-y-4">
//               <input
//                 value={companyData.name}
//                 onChange={(e) => setCompanyData({...companyData, name: e.target.value})}
//                 className="w-full p-2 bg-[#172542] text-gray-300 rounded"
//                 placeholder="Company Name"
//               />
//               <textarea
//                 value={companyData.description}
//                 onChange={(e) => setCompanyData({...companyData, description: e.target.value})}
//                 className="w-full p-2 bg-[#172542] text-gray-300 rounded"
//                 placeholder="Company Description"
//               />
//               <div className="grid grid-cols-2 gap-4">
//                 <input
//                   value={companyData.founded}
//                   onChange={(e) => setCompanyData({...companyData, founded: e.target.value})}
//                   className="p-2 bg-[#172542] text-gray-300 rounded"
//                   placeholder="Founded Year"
//                 />
//                 <input
//                   value={companyData.industry}
//                   onChange={(e) => setCompanyData({...companyData, industry: e.target.value})}
//                   className="p-2 bg-[#172542] text-gray-300 rounded"
//                   placeholder="Industry"
//                 />
//                 <input
//                   value={companyData.location}
//                   onChange={(e) => setCompanyData({...companyData, location: e.target.value})}
//                   className="p-2 bg-[#172542] text-gray-300 rounded"
//                   placeholder="Location"
//                 />
//               </div>
//               <button
//                 onClick={() => handleCompanyUpdate({ overview: companyData })}
//                 className="px-4 py-2 bg-[#7d98d1] text-white rounded"
//               >
//                 Save Changes
//               </button>
//             </div>
//           ) : (
//             <>
//               <p className="text-gray-300 mb-6 leading-relaxed">
//                 {companyData.description || "No description provided"}
//               </p>
//               <div className="grid grid-cols-2 gap-4">
//                 <div className="p-4 bg-[#172542] rounded-lg">
//                   <p className="text-[#7d98d1] font-bold mb-2">Founded</p>
//                   <p className="text-gray-300">{companyData.founded || '-'}</p>
//                 </div>
//                 <div className="p-4 bg-[#172542] rounded-lg">
//                   <p className="text-[#7d98d1] font-bold mb-2">Industry</p>
//                   <p className="text-gray-300">{companyData.industry || '-'}</p>
//                 </div>
//                 <div className="p-4 bg-[#172542] rounded-lg">
//                   <p className="text-[#7d98d1] font-bold mb-2">Location</p>
//                   <p className="text-gray-300">{companyData.location || '-'}</p>
//                 </div>
//               </div>
//             </>
//           )}
//         </motion.div>

//         {/* Team Members Section */}
//         <motion.div className="p-6 bg-[#1f2d47] rounded-xl border border-[#282354]">
//           <div className="flex justify-between items-center mb-6">
//             <h3 className="text-2xl font-bold text-[#7d98d1]">Team Members</h3>
//             <button
//               onClick={() => toggleEditMode('team')}
//               className="text-[#7d98d1] hover:text-white"
//             >
//               {editMode.team ? 'Cancel' : 'Edit'}
//             </button>
//           </div>

//           {editMode.team ? (
//             <div className="space-y-4">
//               {companyData.team?.map((member, index) => (
//                 <div key={index} className="flex items-center space-x-4">
//                   <input
//                     value={member.name}
//                     onChange={(e) => handleArrayUpdate('team', index, 'name', e.target.value)}
//                     className="p-2 bg-[#172542] text-gray-300 rounded flex-1"
//                     placeholder="Name"
//                   />
//                   <input
//                     value={member.role}
//                     onChange={(e) => handleArrayUpdate('team', index, 'role', e.target.value)}
//                     className="p-2 bg-[#172542] text-gray-300 rounded flex-1"
//                     placeholder="Role"
//                   />
//                   <button
//                     onClick={() => removeArrayEntry('team', index)}
//                     className="text-red-500 hover:text-red-400"
//                   >
//                     ×
//                   </button>
//                 </div>
//               ))}
//               <button
//                 onClick={() => addArrayEntry('team', { name: '', role: '', avatar: '' })}
//                 className="px-4 py-2 bg-[#282354] text-[#7d98d1] rounded"
//               >
//                 Add Team Member
//               </button>
//               <button
//                 onClick={() => handleCompanyUpdate({ team: companyData.team })}
//                 className="ml-4 px-4 py-2 bg-[#7d98d1] text-white rounded"
//               >
//                 Save Changes
//               </button>
//             </div>
//           ) : (
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {companyData.team?.map((member, index) => (
//                 <div key={index} className="flex items-center p-4 bg-[#172542] rounded-lg">
//                   <div className="flex-1">
//                     <p className="text-[#7d98d1] font-semibold">{member.name}</p>
//                     <p className="text-gray-300 text-sm">{member.role}</p>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </motion.div>

//               {/* Achievements Section */}
//               <motion.div className="p-6 bg-[#1f2d47] rounded-xl border border-[#282354]">
//                 <div className="flex justify-between items-center mb-6">
//                   <h3 className="text-2xl font-bold text-[#7d98d1]">Milestones</h3>
//                   <button
//                     onClick={() => toggleEditMode('milestones')}
//                     className="text-[#7d98d1] hover:text-white"
//                   >
//                     {editMode.milestones ? 'Cancel' : 'Edit'}
//                   </button>
//                 </div>

//                 {editMode.milestones ? (
//                   <div className="space-y-4">
//                     {companyData.achievements?.map((achievement, index) => (
//                       <div key={index} className="flex gap-4 items-center">
//                         <input
//                           value={achievement.title}
//                           onChange={(e) => handleArrayUpdate('achievements', index, 'title', e.target.value)}
//                           className="p-2 bg-[#172542] text-gray-300 rounded flex-1"
//                           placeholder="Milestone Title"
//                         />
//                         <input
//                           value={achievement.value}
//                           onChange={(e) => handleArrayUpdate('achievements', index, 'value', e.target.value)}
//                           className="p-2 bg-[#172542] text-gray-300 rounded flex-1"
//                           placeholder="Value"
//                         />
//                         <button
//                           onClick={() => removeArrayEntry('achievements', index)}
//                           className="text-red-500 hover:text-red-400"
//                         >
//                           ×
//                         </button>
//                       </div>
//                     ))}
//                     <button
//                       onClick={() => addArrayEntry('achievements', { title: '', value: '' })}
//                       className="px-4 py-2 bg-[#282354] text-[#7d98d1] rounded"
//                     >
//                       Add Milestone
//                     </button>
//                     <button
//                       onClick={() => handleCompanyUpdate({ achievements: companyData.achievements })}
//                       className="ml-4 px-4 py-2 bg-[#7d98d1] text-white rounded"
//                     >
//                       Save Changes
//                     </button>
//                   </div>
//                 ) : (
//                   <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
//                     {companyData.achievements?.map((achievement, index) => (
//                       <div key={index} className="p-4 bg-[#172542] rounded-lg text-center">
//                         <p className="text-[#7d98d1] font-bold text-xl mb-2">
//                           {achievement.value}
//                         </p>
//                         <p className="text-gray-300 text-sm">
//                           {achievement.title}
//                         </p>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </motion.div>

//               {/* Progress Section */}
//               <motion.div className="p-6 bg-[#1f2d47] rounded-xl border border-[#282354]">
//                 <div className="flex justify-between items-center mb-6">
//                   <h3 className="text-2xl font-bold text-[#7d98d1]">Annual Progress</h3>
//                   <button
//                     onClick={() => toggleEditMode('progress')}
//                     className="text-[#7d98d1] hover:text-white"
//                   >
//                     {editMode.progress ? 'Cancel' : 'Edit'}
//                   </button>
//                 </div>

//                 {editMode.progress ? (
//                   <div className="space-y-4">
//                     {companyData.progress?.map((entry, index) => (
//                       <div key={index} className="flex gap-4 items-center">
//                         <input
//                           type="number"
//                           value={entry.year}
//                           onChange={(e) => handleProgressUpdate(index, 'year', e.target.value)}
//                           className="p-2 bg-[#172542] text-gray-300 rounded w-20"
//                           placeholder="Year"
//                         />
//                         <input
//                           type="number"
//                           value={entry.revenue}
//                           onChange={(e) => handleProgressUpdate(index, 'revenue', e.target.value)}
//                           className="p-2 bg-[#172542] text-gray-300 rounded flex-1"
//                           placeholder="Revenue (M$)"
//                         />
//                         <input
//                           type="number"
//                           value={entry.users}
//                           onChange={(e) => handleProgressUpdate(index, 'users', e.target.value)}
//                           className="p-2 bg-[#172542] text-gray-300 rounded flex-1"
//                           placeholder="Users"
//                         />
//                         <button
//                           onClick={() => removeArrayEntry('progress', index)}
//                           className="text-red-500 hover:text-red-400"
//                         >
//                           ×
//                         </button>
//                       </div>
//                     ))}
//                     <button
//                       onClick={addProgressYear}
//                       className="px-4 py-2 bg-[#282354] text-[#7d98d1] rounded"
//                     >
//                       Add Year
//                     </button>
//                     <button
//                       onClick={() => handleCompanyUpdate({ progress: companyData.progress })}
//                       className="ml-4 px-4 py-2 bg-[#7d98d1] text-white rounded"
//                     >
//                       Save Changes
//                     </button>
//                   </div>
//                 ) : (
//                   <div className="h-64 sm:h-80">
//                     <ProgressChart data={companyData.progress || []} />
//                   </div>
//                 )}
//               </motion.div>

//               {/* Targets Section */}
//               <motion.div className="p-6 bg-[#1f2d47] rounded-xl border border-[#282354]">
//                 <div className="flex justify-between items-center mb-6">
//                   <h3 className="text-2xl font-bold text-[#7d98d1]">Key Targets</h3>
//                   <button
//                     onClick={() => toggleEditMode('targets')}
//                     className="text-[#7d98d1] hover:text-white"
//                   >
//                     {editMode.targets ? 'Cancel' : 'Edit'}
//                   </button>
//                 </div>

//                 {editMode.targets ? (
//                   <div className="space-y-4">
//                     {companyData.targets?.map((target, index) => (
//                       <div key={index} className="flex gap-4 items-center">
//                         <select
//                           value={target.icon}
//                           onChange={(e) => handleIconChange(index, e.target.value)}
//                           className="p-2 bg-[#172542] text-gray-300 rounded"
//                         >
//                           {Object.keys(iconComponents).map((iconName) => (
//                             <option key={iconName} value={iconName}>
//                               {iconName}
//                             </option>
//                           ))}
//                         </select>
//                         <input
//                           value={target.title}
//                           onChange={(e) => handleArrayUpdate('targets', index, 'title', e.target.value)}
//                           className="p-2 bg-[#172542] text-gray-300 rounded flex-1"
//                           placeholder="Target Title"
//                         />
//                         <input
//                           value={target.value}
//                           onChange={(e) => handleArrayUpdate('targets', index, 'value', e.target.value)}
//                           className="p-2 bg-[#172542] text-gray-300 rounded flex-1"
//                           placeholder="Target Value"
//                         />
//                         <button
//                           onClick={() => removeArrayEntry('targets', index)}
//                           className="text-red-500 hover:text-red-400"
//                         >
//                           ×
//                         </button>
//                       </div>
//                     ))}
//                     <button
//                       onClick={() => addArrayEntry('targets', { title: '', value: '', icon: 'CurrencyDollarIcon' })}
//                       className="px-4 py-2 bg-[#282354] text-[#7d98d1] rounded"
//                     >
//                       Add Target
//                     </button>
//                     <button
//                       onClick={() => handleCompanyUpdate({ targets: companyData.targets })}
//                       className="ml-4 px-4 py-2 bg-[#7d98d1] text-white rounded"
//                     >
//                       Save Changes
//                     </button>
//                   </div>
//                 ) : (
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     {companyData.targets?.map((target, index) => {
//                       const IconComponent = iconComponents[target.icon];
//                       return (
//                         <div 
//                           key={index}
//                           className="p-4 bg-[#172542] rounded-lg flex items-center space-x-4"
//                         >
//                           {IconComponent && <IconComponent className="h-8 w-8 text-[#7d98d1]" />}
//                           <div>
//                             <p className="text-[#7d98d1] font-semibold">{target.value}</p>
//                             <p className="text-gray-300 text-sm">{target.title}</p>
//                           </div>
//                         </div>
//                       );
//                     })}
//                   </div>
//                 )}
//               </motion.div>
//             </div>
//           </>
//         )}
//       </div>
//     </motion.div>
//   );
// };

// export default ProfilePage;


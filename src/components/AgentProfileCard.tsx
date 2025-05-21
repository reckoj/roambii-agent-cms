// import { useEffect } from "react";
// import { UserCircleIcon, BriefcaseIcon, GlobeAltIcon, LanguageIcon } from "@heroicons/react/24/outline";
// import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
// import { RootState } from "@/lib/redux/store";
// import { fetchAgentProfileAsync } from "@/lib/redux/slices/agentProfileSlice";
// import Link from "next/link";

// const AgentProfileCard = () => {
//   const dispatch = useAppDispatch();
//   const { agent } = useAppSelector((state: RootState) => state.auth);
//   const { profile, loading } = useAppSelector((state: RootState) => state.agentProfile);

//   useEffect(() => {
//     // Fetch profile if not already loaded
//     if (agent?.id && !profile) {
//       dispatch(fetchAgentProfileAsync(agent.id));
//     }
//   }, [agent, profile, dispatch]);

//   if (loading || !profile) {
//     return (
//       <div className="bg-white shadow rounded-lg p-6 animate-pulse">
//         <div className="flex items-center">
//           <div className="rounded-full bg-gray-200 h-14 w-14"></div>
//           <div className="ml-4 flex-1">
//             <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
//             <div className="h-3 bg-gray-200 rounded w-1/4"></div>
//           </div>
//         </div>
//         <div className="mt-4 space-y-3">
//           <div className="h-3 bg-gray-200 rounded w-3/4"></div>
//           <div className="h-3 bg-gray-200 rounded w-2/3"></div>
//           <div className="h-3 bg-gray-200 rounded w-1/2"></div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-white shadow rounded-lg overflow-hidden">
//       <div className="p-6">
//         <div className="flex items-center">
//           <div className="flex-shrink-0 h-14 w-14 rounded-full overflow-hidden bg-gray-100">
//             {profile.avatar ? (
//               <img
//                 src={profile.avatar}
//                 alt={profile.name}
//                 className="h-full w-full object-cover"
//               />
//             ) : (
//               <div className="h-full w-full flex items-center justify-center">
//                 <UserCircleIcon className="h-12 w-12 text-gray-400" />
//               </div>
//             )}
//           </div>
//           <div className="ml-4">
//             <h3 className="text-lg font-medium text-gray-900">{profile.name}</h3>
//             <p className="text-sm text-cyan-600">Travel Agent</p>
//           </div>
//         </div>

//         <div className="mt-4 space-y-3">
//           <div className="flex items-center text-sm text-gray-600">
//             <BriefcaseIcon className="h-5 w-5 text-cyan-500 mr-2" />
//             <span>
//               {profile.yearsOfExperience} {profile.yearsOfExperience === 1 ? "year" : "years"} experience
//             </span>
//           </div>

//           <div className="flex items-center text-sm text-gray-600">
//             <GlobeAltIcon className="h-5 w-5 text-cyan-500 mr-2" />
//             <span>{profile.region || "Global"}</span>
//           </div>

//           {profile.languages?.length > 0 && (
//             <div className="flex items-start text-sm text-gray-600">
//               <LanguageIcon className="h-5 w-5 text-cyan-500 mr-2 mt-0.5" />
//               <span>{profile.languages.join(", ")}</span>
//             </div>
//           )}

//           {profile.bio && (
//             <p className="mt-4 text-sm text-gray-600 line-clamp-3">
//               {profile.bio}
//             </p>
//           )}
//         </div>

//         <div className="mt-6">
//           <Link
//             href="/profile"
//             className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
//           >
//             View Full Profile
//           </Link>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AgentProfileCard;

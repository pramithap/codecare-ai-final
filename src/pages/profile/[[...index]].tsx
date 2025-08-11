import { UserProfile } from "@clerk/nextjs";

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            User Profile
          </h1>
          <p className="text-gray-600">
            Manage your account settings and preferences
          </p>
        </div>
        
        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
          <UserProfile 
            path="/profile"
            routing="path"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0 bg-transparent w-full p-8",
                headerTitle: "text-2xl font-bold text-gray-900 mb-2",
                headerSubtitle: "text-gray-600 mb-6",
                formButtonPrimary: "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 py-3 px-6 text-base font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl",
                formFieldInput: "border-2 border-gray-300 rounded-lg py-3 px-4 text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                formFieldLabel: "text-gray-700 font-medium text-sm mb-2",
                accordionTriggerButton: "text-gray-900 font-medium text-lg hover:text-indigo-600",
                breadcrumbsLink: "text-indigo-600 hover:text-indigo-500 font-medium",
                navbarButton: "text-gray-700 hover:text-indigo-600 font-medium",
                profileSectionPrimaryButton: "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 py-2 px-4 text-sm font-medium rounded-lg",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Join CodeCare AI
          </h1>
          <p className="text-gray-600">
            Create your account to get started
          </p>
        </div>
        <div className="bg-white py-8 px-6 shadow-lg rounded-lg sm:px-10">
          <SignUp 
            path="/sign-up"
            routing="path"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "w-full mx-auto",
                card: "shadow-none border-0 bg-transparent w-full",
                headerTitle: "text-2xl font-bold text-gray-900 text-center",
                headerSubtitle: "text-gray-600 text-center",
                socialButtonsBlockButton: "w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 justify-center",
                formButtonPrimary: "w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 justify-center",
                footerActionLink: "text-indigo-600 hover:text-indigo-500",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

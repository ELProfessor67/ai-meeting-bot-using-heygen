"use client"
import { useState } from "react"
import {useRouter} from "next/navigation"

export default function Home() {
  const [name, setName] = useState("")
  const router = useRouter();
  const handleStart = () => {
    router.push(`/meeting?name=${name}`)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-r from-cyan-500 to-blue-500">
      <div className="w-full max-w-md p-8 m-4 bg-white bg-opacity-20 backdrop-blur-xl rounded-3xl shadow-2xl space-y-8 transform transition duration-500 hover:scale-105">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold text-white tracking-wider">Embark on Your AI Journey</h1>
          <p className="text-xl text-blue-100">Enter your name to begin</p>
        </div>
        <div className="space-y-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white bg-opacity-50 border-2 border-white border-opacity-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent placeholder-blue-300 text-blue-900 text-lg transition duration-300"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg
                className="w-6 h-6 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                ></path>
              </svg>
            </div>
          </div>
          <button
            onClick={handleStart}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 text-lg"
          >
            Start Meet With Our AI
          </button>
        </div>
        <div className="text-center">
          <p className="text-blue-100 text-opacity-80">A World of AI Awaits You!</p>
        </div>
      </div>
    </main>
  )
}


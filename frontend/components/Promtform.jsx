"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HelpCircle, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ADMINISTRATOR_PROMT, BotsPrompt } from "@/constant/BotsPromt"
import { useRouter } from "next/navigation"
import { usePromt } from "@/context/PromtContext"

const bots = ["Sam", "Zara", "Ben", "Max"]
const botsRole = {
    "Sam": "Financial Expert for Small and Medium-Sized Businesses (Crypto-Savvy)",
    "Zara": "Sales and Marketing Consultant",
    "Ben": "Venture Capital and Scaling Expert (Mark Cuban-Style)",
    "Max": "Technology Consultant"
}

export default function PromtForm() {
    const {selectedBots,setSelectedBots,prompts,setPrompts,administrator,setAdministrator} = usePromt();

    const router = useRouter();

    const handleBotSelection = (bot) => {
        if (selectedBots.includes(bot)) {
            setSelectedBots(selectedBots.filter((b) => b !== bot))
            const { [bot]: _, ...rest } = prompts
            setPrompts(rest)
        } else {
            setSelectedBots([...selectedBots, bot])
            setPrompts({ ...prompts, [bot]: BotsPrompt[bot] })
        }
    }

    const handlePromptChange = (bot, value) => {
        setPrompts({ ...prompts, [bot]: value })
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        router.push('/meeting')
        
    }

    useEffect(() => {
        const value = ADMINISTRATOR_PROMT(selectedBots);
        setAdministrator(value)
    },[selectedBots])

    return (
        <Card className="w-full max-w-2xl mx-auto shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <CardTitle className="text-2xl font-bold">Bot Prompt Configuration</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    

                    <div className="space-y-2">
                        <Label className="text-lg font-medium">Select Bots</Label>
                        <div className="flex flex-wrap gap-2">
                            {bots.map((bot) => (
                                <Badge
                                    key={bot}
                                    variant={selectedBots.includes(bot) ? "default" : "outline"}
                                    className={`cursor-pointer text-sm font-medium py-1 px-3 rounded-full transition-all duration-200 ${selectedBots.includes(bot)
                                            ? "bg-purple-500 text-white hover:bg-purple-600"
                                            : "bg-white text-gray-700 hover:bg-gray-100"
                                        }`}
                                    onClick={() => handleBotSelection(bot)}
                                >
                                    {bot}
                                    {selectedBots.includes(bot) && <X className="ml-1 h-3 w-3" />}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <AnimatePresence>
                        {selectedBots.map((bot) => (
                            <motion.div
                                key={bot}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-2"
                            >
                                <Label htmlFor={`${bot}-prompt`} className="text-lg font-medium">
                                    {bot}: {botsRole[bot]}
                                </Label>
                                <Textarea
                                    id={`${bot}-prompt`}
                                    value={prompts[bot]}
                                    onChange={(e) => handlePromptChange(bot, e.target.value)}
                                    placeholder={`Enter prompt for ${bot}`}
                                    className="border-2 border-gray-300 focus:border-purple-500 transition-colors duration-200 min-h-[100px]"
                                    
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    


                    <div className="space-y-2">
                        <Label htmlFor="administrator" className="flex items-center space-x-2 text-lg font-medium gap-2">
                            Administrator
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <HelpCircle className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-gray-800 text-white p-2 rounded-md">
                                        <p>Administrator manages which bot responds and which does not.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </Label>

                        <Textarea
                            id="administrator"
                            value={administrator}
                            onChange={(e) => setAdministrator(e.target.value)}
                             placeholder="Enter administrator Prompt"
                            className="border-2 border-gray-300 focus:border-purple-500 transition-colors duration-200 min-h-[100px]"
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-2 px-4 rounded-md hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                    >
                        Submit
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}


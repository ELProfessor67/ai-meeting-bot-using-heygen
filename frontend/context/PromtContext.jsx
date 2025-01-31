'use client'
import { createContext, useContext, useState } from "react";

const PromtContext = createContext();


export const PromtProvider = ({ children }) => {
    const [selectedBots, setSelectedBots] = useState([])
    const [prompts, setPrompts] = useState({})
    const [administrator, setAdministrator] = useState("")




    return <PromtContext.Provider value={{selectedBots,setSelectedBots,prompts,setPrompts,administrator,setAdministrator}}>
        {children}
    </PromtContext.Provider>
}


export const usePromt = () => {
    return useContext(PromtContext);
}
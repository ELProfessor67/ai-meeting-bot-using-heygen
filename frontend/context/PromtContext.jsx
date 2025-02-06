'use client'
import { createContext, useContext, useState } from "react";

const PromtContext = createContext();


export const PromtProvider = ({ children }) => {
    const [selectedBots, setSelectedBots] = useState([])
    const [prompts, setPrompts] = useState({})




    return <PromtContext.Provider value={{selectedBots,setSelectedBots,prompts,setPrompts}}>
        {children}
    </PromtContext.Provider>
}


export const usePromt = () => {
    return useContext(PromtContext);
}
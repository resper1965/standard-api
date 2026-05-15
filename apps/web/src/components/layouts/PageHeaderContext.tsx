import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

type PageHeaderState = {
  description?: string
  actions?: ReactNode
}

type PageHeaderContextType = {
  state: PageHeaderState
  setHeader: (header: PageHeaderState) => void
  clear: () => void
}

const PageHeaderContext = createContext<PageHeaderContextType>({
  state: {},
  setHeader: () => {},
  clear: () => {},
})

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PageHeaderState>({})

  const setHeader = useCallback((header: PageHeaderState) => {
    setState(header)
  }, [])

  const clear = useCallback(() => {
    setState({})
  }, [])

  return (
    <PageHeaderContext.Provider value={{ state, setHeader, clear }}>
      {children}
    </PageHeaderContext.Provider>
  )
}

export function usePageHeader() {
  return useContext(PageHeaderContext)
}

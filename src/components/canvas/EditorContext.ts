import { createContext, useContext } from "react";
export interface EditorActions {
  fontSize: number;
  beginResize: (id: string) => void;
  endResize: () => void;
  editNode: (id: string) => void;
}
export const EditorContext = createContext<EditorActions>({
  fontSize: 14,
  beginResize: () => {},
  endResize: () => {},
  editNode: () => {},
});
export const useEditorActions = () => useContext(EditorContext);

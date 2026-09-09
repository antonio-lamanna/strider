import { createContext, useContext } from "react";
export interface EditorActions {
  beginResize: (id: string) => void;
  endResize: () => void;
  editNode: (id: string) => void;
}
export const EditorContext = createContext<EditorActions>({
  beginResize: () => {},
  endResize: () => {},
  editNode: () => {},
});
export const useEditorActions = () => useContext(EditorContext);

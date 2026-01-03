import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, FileText } from 'lucide-react';

interface Note {
    id: string;
    title: string;
    content: string;
    date: number;
}

interface StockNotesProps {
    symbol: string;
}

export const StockNotes: React.FC<StockNotesProps> = ({ symbol }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState<{ title: string, content: string }>({ title: '', content: '' });
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Load from local storage
    useEffect(() => {
        const saved = localStorage.getItem(`notes_${symbol}`);
        if (saved) {
            setNotes(JSON.parse(saved));
        }
    }, [symbol]);

    // Save to local storage
    useEffect(() => {
        if (notes.length > 0) {
            localStorage.setItem(`notes_${symbol}`, JSON.stringify(notes));
        }
    }, [notes, symbol]);

    const handleCreate = () => {
        const newNote: Note = {
            id: Date.now().toString(),
            title: 'Nueva Nota',
            content: '',
            date: Date.now()
        };
        setNotes([newNote, ...notes]);
        setSelectedId(newNote.id);
        setEditContent({ title: newNote.title, content: newNote.content });
        setIsEditing(true);
    };

    const handleEdit = () => {
        if (!selectedId) return;
        const note = notes.find(n => n.id === selectedId);
        if (note) {
            setEditContent({ title: note.title, content: note.content });
            setIsEditing(true);
        }
    };

    const handleDeleteClick = () => {
        if (!selectedId) return;
        setShowDeleteModal(true);
    };

    const confirmDelete = () => {
        if (!selectedId) return;
        const newNotes = notes.filter(n => n.id !== selectedId);
        setNotes(newNotes);
        localStorage.setItem(`notes_${symbol}`, JSON.stringify(newNotes)); // Force save immediately
        setSelectedId(null);
        setIsEditing(false);
        setShowDeleteModal(false);
    };

    const handleSave = () => {
        if (!selectedId) return;
        setNotes(notes.map(n => n.id === selectedId ? { ...n, ...editContent, date: Date.now() } : n));
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    return (
        <div className="flex bg-[#1C1C1E] rounded-2xl border border-zinc-800 h-[400px] overflow-hidden mx-4 my-2 relative">
            {/* Notes List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notes.length === 0 && !isEditing && (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                        <FileText size={48} className="mb-2 opacity-20" />
                        <p className="text-sm">No hay notas guardadas</p>
                    </div>
                )}

                {notes.map(note => (
                    <div
                        key={note.id}
                        onClick={() => !isEditing && setSelectedId(note.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer relative min-h-[100px] flex flex-col ${selectedId === note.id
                                ? 'bg-blue-500/10 border-blue-500/50'
                                : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                            }`}
                    >
                        {isEditing && selectedId === note.id ? (
                            <div className="space-y-3 flex-1">
                                <input
                                    type="text"
                                    value={editContent.title}
                                    onChange={(e) => setEditContent(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-bold"
                                    placeholder="Título de la nota"
                                    autoFocus
                                />
                                <textarea
                                    value={editContent.content}
                                    onChange={(e) => setEditContent(prev => ({ ...prev, content: e.target.value }))}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 min-h-[100px]"
                                    placeholder="Escribe tu nota aquí..."
                                />
                            </div>
                        ) : (
                            <div className="flex-1 pb-4">
                                <h4 className="text-white font-bold text-sm mb-1">{note.title}</h4>
                                <p className="text-zinc-400 text-xs line-clamp-3 whitespace-pre-wrap">{note.content || '(Sin contenido)'}</p>
                            </div>
                        )}
                        {!isEditing && (
                            <div className="absolute bottom-3 right-4">
                                <span className="text-[10px] text-zinc-600 font-medium bg-zinc-900/40 px-2 py-0.5 rounded-full">
                                    {new Date(note.date).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Vertical Toolbar */}
            <div className="w-16 bg-zinc-900/50 border-l border-zinc-800 flex flex-col items-center py-6 gap-6">
                {!isEditing ? (
                    <>
                        <button onClick={handleCreate} className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20" title="Nueva Nota">
                            <Plus size={20} />
                        </button>
                        <button
                            onClick={handleEdit}
                            disabled={!selectedId}
                            className={`p-3 rounded-full transition-colors ${selectedId ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white' : 'text-zinc-700 cursor-not-allowed'}`}
                            title="Editar"
                        >
                            <Edit2 size={20} />
                        </button>
                        <button
                            onClick={handleDeleteClick}
                            disabled={!selectedId}
                            className={`p-3 rounded-full transition-colors ${selectedId ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300' : 'text-zinc-700 cursor-not-allowed'}`}
                            title="Eliminar"
                        >
                            <Trash2 size={20} />
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={handleSave} className="p-3 bg-green-600 text-white rounded-full hover:bg-green-500 transition-colors shadow-lg shadow-green-900/20" title="Guardar">
                            <Save size={20} />
                        </button>
                        <button onClick={handleCancel} className="p-3 bg-zinc-700 text-zinc-300 rounded-full hover:bg-zinc-600 transition-colors" title="Cancelar">
                            <X size={20} />
                        </button>
                    </>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-black border border-zinc-800 rounded-2xl p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-5">
                            <span className="text-red-500 text-2xl font-bold">!</span>
                        </div>
                        <h3 className="text-white text-lg font-bold mb-2">Delete Note?</h3>
                        <p className="text-zinc-500 text-sm mb-8">This action cannot be undone.</p>

                        <div className="flex gap-4 w-full">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-red-900/20"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

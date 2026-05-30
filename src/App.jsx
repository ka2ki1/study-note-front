import { useEffect, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./App.css";

function SortableNoteCard({ note, favorites, toggleFavorite, handleShowDetail }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="card">
      <div className="card-header">
        <button className="drag-handle" {...attributes} {...listeners}>
          ☰
        </button>

        <h2 onClick={() => handleShowDetail(note.id)}>{note.title}</h2>

        <button
          className="favorite-button"
          onClick={(e) => toggleFavorite(note.id, e)}
        >
          {favorites.includes(note.id) ? "⭐" : "☆"}
        </button>
      </div>

      <div onClick={() => handleShowDetail(note.id)}>
        {note.category && <span className="tag">{note.category}</span>}
        <p>{note.summary}</p>
      </div>
    </div>
  );
}

function App() {
  const [studyNotes, setStudyNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedNote, setSelectedNote] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortType, setSortType] = useState("custom");
  const [isOffline, setIsOffline] = useState(false);

  const categories = ["Laravel", "React", "Docker", "Git"];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const [form, setForm] = useState({
    title: "",
    category: "",
    summary: "",
    content: "",
    example_code: "",
    memo: "",
  });

  useEffect(() => {
    fetchStudyNotes();

    const savedFavorites =
      JSON.parse(localStorage.getItem("study-note-favorites")) || [];
    setFavorites(savedFavorites);
  }, []);

  const applySavedOrder = (notes) => {
    const savedOrder =
      JSON.parse(localStorage.getItem("study-note-order")) || [];

    if (savedOrder.length === 0) {
      return notes;
    }

    return [...notes].sort((a, b) => {
      const indexA = savedOrder.indexOf(a.id);
      const indexB = savedOrder.indexOf(b.id);

      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });
  };

  const saveNotesCache = (notes) => {
    localStorage.setItem("study-notes-cache", JSON.stringify(notes));
  };

  const getNotesCache = () => {
    return JSON.parse(localStorage.getItem("study-notes-cache")) || [];
  };

  const filterCachedNotes = (notes, keyword) => {
    if (!keyword) {
      return notes;
    }

    const lowerKeyword = keyword.toLowerCase();

    return notes.filter((note) => {
      return (
        note.title?.toLowerCase().includes(lowerKeyword) ||
        note.category?.toLowerCase().includes(lowerKeyword) ||
        note.summary?.toLowerCase().includes(lowerKeyword) ||
        note.content?.toLowerCase().includes(lowerKeyword) ||
        note.memo?.toLowerCase().includes(lowerKeyword)
      );
    });
  };

  const fetchStudyNotes = async (keyword = "") => {
    try {
      const res = await axios.get(
        `http://localhost:8081/api/study-notes?search=${keyword}`
      );

      const orderedNotes = applySavedOrder(res.data.data);

      setStudyNotes(orderedNotes);
      saveNotesCache(orderedNotes);
      setIsOffline(false);
    } catch (error) {
      console.log("オフラインモード");

      const cachedNotes = getNotesCache();
      const filteredCachedNotes = filterCachedNotes(cachedNotes, keyword);

      setStudyNotes(applySavedOrder(filteredCachedNotes));
      setIsOffline(true);
    }
  };

  const resetForm = () => {
    setForm({
      title: "",
      category: "",
      summary: "",
      content: "",
      example_code: "",
      memo: "",
    });

    setEditingId(null);
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingId) {
      await axios.put(
        `http://localhost:8081/api/study-notes/${editingId}`,
        form
      );
    } else {
      await axios.post("http://localhost:8081/api/study-notes", form);
    }

    resetForm();
    fetchStudyNotes(search);
    setSelectedNote(null);
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    fetchStudyNotes(e.target.value);
  };

  const handleCategoryClick = (category) => {
    setSearch(category);
    fetchStudyNotes(category);
  };

  const handleClearFilter = () => {
    setSearch("");
    fetchStudyNotes("");
  };

  const handleShowDetail = async (id) => {
    try {
      const res = await axios.get(`http://localhost:8081/api/study-notes/${id}`);
      setSelectedNote(res.data);
      setIsOffline(false);
    } catch (error) {
      const cachedNotes = getNotesCache();
      const cachedNote = cachedNotes.find((note) => note.id === id);

      if (cachedNote) {
        setSelectedNote(cachedNote);
        setIsOffline(true);
      }
    }
  };

  const handleEdit = (note) => {
    setEditingId(note.id);

    setForm({
      title: note.title || "",
      category: note.category || "",
      summary: note.summary || "",
      content: note.content || "",
      example_code: note.example_code || "",
      memo: note.memo || "",
    });

    setSelectedNote(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const result = window.confirm("このノートを削除しますか？");

    if (!result) return;

    await axios.delete(`http://localhost:8081/api/study-notes/${id}`);

    setSelectedNote(null);
    resetForm();
    fetchStudyNotes(search);
  };

  const toggleFavorite = (id, e) => {
    e.stopPropagation();

    let updatedFavorites;

    if (favorites.includes(id)) {
      updatedFavorites = favorites.filter((favId) => favId !== id);
    } else {
      updatedFavorites = [...favorites, id];
    }

    setFavorites(updatedFavorites);
    localStorage.setItem(
      "study-note-favorites",
      JSON.stringify(updatedFavorites)
    );
  };

  const handleSortChange = (e) => {
    setSortType(e.target.value);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setSortType("custom");

    setStudyNotes((notes) => {
      const oldIndex = notes.findIndex((note) => note.id === active.id);
      const newIndex = notes.findIndex((note) => note.id === over.id);

      const newNotes = arrayMove(notes, oldIndex, newIndex);

      localStorage.setItem(
        "study-note-order",
        JSON.stringify(newNotes.map((note) => note.id))
      );

      saveNotesCache(newNotes);

      return newNotes;
    });
  };

  const filteredNotes = showFavoritesOnly
    ? studyNotes.filter((note) => favorites.includes(note.id))
    : studyNotes;

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (sortType === "new") {
      return new Date(b.created_at) - new Date(a.created_at);
    }

    if (sortType === "old") {
      return new Date(a.created_at) - new Date(b.created_at);
    }

    if (sortType === "title") {
      return a.title.localeCompare(b.title, "ja");
    }

    return 0;
  });

  return (
    <div className="container">
      <h1>Study Note</h1>

      {isOffline && (
        <div className="offline-banner">
          オフライン表示中です。保存済みデータを表示しています。
        </div>
      )}

      <input
        type="text"
        className="search-input"
        placeholder="検索（Laravel / React / Docker）"
        value={search}
        onChange={handleSearch}
      />

      <div className="category-buttons">
        <button type="button" onClick={handleClearFilter}>
          すべて
        </button>

        {categories.map((category) => (
          <button
            type="button"
            key={category}
            onClick={() => handleCategoryClick(category)}
          >
            {category}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
        >
          {showFavoritesOnly ? "すべて表示" : "お気に入りのみ"}
        </button>
      </div>

      <select
        className="sort-select"
        value={sortType}
        onChange={handleSortChange}
      >
        <option value="custom">手動並び順</option>
        <option value="new">新しい順</option>
        <option value="old">古い順</option>
        <option value="title">タイトル順</option>
      </select>

      <form onSubmit={handleSubmit}>
        <input
          name="title"
          placeholder="タイトル"
          value={form.title}
          onChange={handleChange}
        />

        <input
          name="category"
          placeholder="カテゴリ"
          value={form.category}
          onChange={handleChange}
        />

        <textarea
          name="summary"
          placeholder="ざっくり説明"
          value={form.summary}
          onChange={handleChange}
        />

        <textarea
          name="content"
          placeholder="詳しい内容（Markdown OK）"
          value={form.content}
          onChange={handleChange}
        />

        <textarea
          name="example_code"
          placeholder="コード例"
          value={form.example_code}
          onChange={handleChange}
        />

        <textarea
          name="memo"
          placeholder="メモ（Markdown OK）"
          value={form.memo}
          onChange={handleChange}
        />

        <button type="submit">{editingId ? "更新" : "登録"}</button>

        {editingId && (
          <button type="button" className="cancel-button" onClick={resetForm}>
            キャンセル
          </button>
        )}
      </form>

      <hr />

      {selectedNote && (
        <div className="modal-overlay" onClick={() => setSelectedNote(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="detail-buttons">
              <button onClick={() => setSelectedNote(null)}>閉じる</button>
              <button onClick={() => handleEdit(selectedNote)}>編集</button>
              <button onClick={() => handleDelete(selectedNote.id)}>削除</button>
            </div>

            <h2>{selectedNote.title}</h2>

            {selectedNote.category && (
              <span className="tag">{selectedNote.category}</span>
            )}

            <p>{selectedNote.summary}</p>

            <h3>詳しい内容</h3>
            <div className="markdown-body">
              <ReactMarkdown>{selectedNote.content || ""}</ReactMarkdown>
            </div>

            <h3>コード例</h3>
            <pre>{selectedNote.example_code}</pre>

            <h3>メモ</h3>
            <div className="markdown-body">
              <ReactMarkdown>{selectedNote.memo || ""}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedNotes.map((note) => note.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="note-list">
            {sortedNotes.map((note) => (
              <SortableNoteCard
                key={note.id}
                note={note}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                handleShowDetail={handleShowDetail}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export default App;

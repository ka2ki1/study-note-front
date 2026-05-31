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
        {note.image_data && <p>📷 画像あり</p>}
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
  const [imagePreview, setImagePreview] = useState(null);

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
    image_data: "",
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

    if (savedOrder.length === 0) return notes;

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
    if (!keyword) return notes;

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

  const updateLocalNotes = (notes) => {
    const orderedNotes = applySavedOrder(notes);
    setStudyNotes(orderedNotes);
    saveNotesCache(orderedNotes);
  };

  const fetchStudyNotes = async (keyword = "") => {
    try {
      const res = await axios.get(
        `http://localhost:8081/api/study-notes?search=${keyword}`
      );

      const apiNotes = res.data.data;
      const cachedNotes = getNotesCache();

      const mergedNotes = apiNotes.map((apiNote) => {
        const cachedNote = cachedNotes.find((note) => note.id === apiNote.id);

        return {
          ...apiNote,
          image_data: apiNote.image_data || cachedNote?.image_data || "",
        };
      });

      const orderedNotes = applySavedOrder(mergedNotes);

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
      image_data: "",
    });

    setEditingId(null);
    setImagePreview(null);
  };

  const handleChange = (e) => {
    setForm((prevForm) => ({
      ...prevForm,
      [e.target.name]: e.target.value,
    }));
  };

  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const base64Image = reader.result;

      console.log("画像Base64作成OK", base64Image.slice(0, 50));

      setImagePreview(base64Image);

      setForm((prevForm) => ({
        ...prevForm,
        image_data: base64Image,
      }));
    };

    reader.readAsDataURL(file);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    handleImageFile(file);
  };

  const handlePasteImage = (e) => {
    const items = e.clipboardData.items;

    for (let item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        handleImageFile(file);
        break;
      }
    }
  };

  const handleDropImage = (e) => {
    e.preventDefault();

    const file = e.dataTransfer.files[0];
    handleImageFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const saveToCacheAfterApiSuccess = (savedNote) => {
    const cachedNotes = getNotesCache();
    const exists = cachedNotes.some((note) => note.id === savedNote.id);

    const updatedNotes = exists
      ? cachedNotes.map((note) => (note.id === savedNote.id ? savedNote : note))
      : [savedNote, ...cachedNotes];

    updateLocalNotes(updatedNotes);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("送信するform", {
      ...form,
      image_data: form.image_data ? form.image_data.slice(0, 50) + "..." : "",
    });

    try {
      if (editingId) {
        const res = await axios.put(
          `http://localhost:8081/api/study-notes/${editingId}`,
          form
        );

        saveToCacheAfterApiSuccess(res.data);
      } else {
        const res = await axios.post(
          "http://localhost:8081/api/study-notes",
          form
        );

        saveToCacheAfterApiSuccess(res.data);
      }

      fetchStudyNotes(search);
      setIsOffline(false);
    } catch (error) {
      const cachedNotes = getNotesCache();

      if (editingId) {
        const updatedNotes = cachedNotes.map((note) =>
          note.id === editingId
            ? {
              ...note,
              ...form,
              updated_at: new Date().toISOString(),
              is_offline: true,
            }
            : note
        );

        updateLocalNotes(updatedNotes);
      } else {
        const offlineNote = {
          id: Date.now(),
          ...form,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_offline: true,
        };

        const updatedNotes = [offlineNote, ...cachedNotes];

        updateLocalNotes(updatedNotes);
      }

      setIsOffline(true);
    }

    resetForm();
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

      const cachedNotes = getNotesCache();
      const cachedNote = cachedNotes.find((note) => note.id === id);

      setSelectedNote({
        ...res.data,
        image_data: res.data.image_data || cachedNote?.image_data || "",
      });

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
      image_data: note.image_data || "",
    });

    setImagePreview(note.image_data || null);
    setSelectedNote(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const result = window.confirm("このノートを削除しますか？");

    if (!result) return;

    try {
      await axios.delete(`http://localhost:8081/api/study-notes/${id}`);
      fetchStudyNotes(search);
      setIsOffline(false);
    } catch (error) {
      const cachedNotes = getNotesCache();
      const updatedNotes = cachedNotes.filter((note) => note.id !== id);

      updateLocalNotes(updatedNotes);
      setIsOffline(true);
    }

    setSelectedNote(null);
    resetForm();
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

    if (!over || active.id === over.id) return;

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
          オフラインモードです。localStorageのデータを使っています。
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

        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          className="category-select"
        >
          <option value="">カテゴリを選択</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

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

        <div
          className="image-upload-area"
          onPaste={handlePasteImage}
          onDrop={handleDropImage}
          onDragOver={handleDragOver}
          tabIndex="0"
        >
          <p>画像アップロード</p>
          <p className="image-upload-help">
            クリックして選択 / Ctrl + Vで貼り付け / ドラッグ&ドロップ
          </p>

          <input type="file" accept="image/*" onChange={handleImageChange} />

          {imagePreview && (
            <img src={imagePreview} alt="preview" className="preview-image" />
          )}
        </div>

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

            <h2>
              {selectedNote.title}
              {selectedNote.is_offline && "（オフライン保存）"}
            </h2>

            {selectedNote.category && (
              <span className="tag">{selectedNote.category}</span>
            )}

            <p>{selectedNote.summary}</p>

            {selectedNote.image_data && (
              <>
                <h3>画像</h3>
                <img
                  src={selectedNote.image_data}
                  alt="note"
                  className="detail-image"
                />
              </>
            )}

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

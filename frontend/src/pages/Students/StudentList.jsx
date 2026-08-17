import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  InputAdornment,
  LinearProgress,
  Alert,
  Fab,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import MainLayout from "../../components/layout/MainLayout";
import api from "../../services/api";
import { useSnackbar } from "notistack";

export default function StudentList() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchStudents();
  }, [page, rowsPerPage, search]);

  // In StudentList.js - Update fetchStudents function
  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/students", {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search: search || undefined,
        },
      });

      console.log("Students response:", response.data);

      if (response.data.success) {
        const data = response.data.data;

        // Handle different response structures
        let studentsList = [];
        let totalCount = 0;

        if (data.students) {
          studentsList = data.students;
          totalCount = data.pagination?.total || data.students.length;
        } else if (Array.isArray(data)) {
          studentsList = data;
          totalCount = data.length;
        } else if (data.items) {
          studentsList = data.items;
          totalCount = data.pagination?.total || 0;
        }

        setStudents(studentsList);
        setTotal(totalCount);
      } else {
        setError(response.data.message || "Failed to load students");
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
      setError(error.response?.data?.message || "Network error");
      enqueueSnackbar("Failed to load students", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student?"))
      return;

    try {
      await api.delete(`/students/${id}`);
      enqueueSnackbar("Student deleted successfully", { variant: "success" });
      fetchStudents();
    } catch (error) {
      enqueueSnackbar("Failed to delete student", { variant: "error" });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "success";
      case "inactive":
        return "default";
      case "graduated":
        return "info";
      case "withdrawn":
        return "warning";
      case "suspended":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <MainLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Students
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage all student records
        </Typography>
      </Box>

      <Card sx={{ overflow: "visible" }}>
        {" "}
        {/* Allow overflow so button isn't cut */}
        <CardContent>
          {/* Search and Add Button */}
          <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
            <TextField
              placeholder="Search students..."
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: 1, minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate("/students/add")}
            >
              Add Student
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <LinearProgress />
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Student ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Grade</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {students.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            No students found. Click "Add Student" to create
                            one.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      students.map((student) => (
                        <TableRow key={student._id}>
                          <TableCell>{student.studentId}</TableCell>
                          <TableCell>
                            {student.firstName} {student.lastName}
                          </TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>{student.grade}</TableCell>
                          <TableCell>
                            <Chip
                              label={student.status}
                              color={getStatusColor(student.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() =>
                                navigate(`/students/${student._id}`)
                              }
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() =>
                                navigate(`/students/edit/${student._id}`)
                              }
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(student._id)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={total}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Floating Action Button - Always Visible */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={() => navigate("/students/add")}
        sx={{
          position: "fixed",
          bottom: 32,
          right: 32,
          zIndex: 9999,
        }}
      >
        <AddIcon />
      </Fab>
    </MainLayout>
  );
}

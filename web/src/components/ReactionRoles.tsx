import { useEffect, useState } from "react";
import { request } from "../util.ts";
import { Button, Card, FieldError, Input, Label, Modal, Select, Skeleton } from "./ui/index.ts";

const ReactionRoles = () => {
  const [loading, setLoading] = useState(true);
  const [iamRoles, setIamRoles] = useState<{ roleId: string; roleName: string; tag: string }[]>([]);
  const [roles, setRoles] = useState<{ name: string; id: string }[]>([]);

  const [addNewRole, setAddNewRole] = useState("");
  const [addNewTag, setAddNewTag] = useState("");

  const [editRole, setEditRole] = useState("");
  const [editRoleTag, setEditRoleTag] = useState("");

  const [deleteRoleId, setDeleteRoleId] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const addRoleError = iamRoles.find((role) => role.roleId === addNewRole) ? "This role already has a tag" : "";
  const addTagError = iamRoles.find((role) => role.tag === addNewTag) ? "This tag is already used" : !/^[a-z0-9]+$/.test(addNewTag) ? "One word is required" : "";

  useEffect(() => {
    const fetchRolesData = async () => {
      const iamRolesFetch = await request("GET", "/api/iam-roles");
      if (iamRolesFetch.ok) {
        setIamRoles(iamRolesFetch.data);
      }

      const rolesFetch = await request("GET", "/api/roles");
      if (rolesFetch.ok) {
        setRoles(rolesFetch.data);
      }

      setLoading(false);
    };

    fetchRolesData();
  }, []);

  const addNew = async () => {
    if (!addNewRole) return;

    const res = await request("POST", "/api/iam-roles", { roleId: addNewRole, tag: addNewTag });

    if (res.ok) {
      setIamRoles((prev) => [...prev, { roleId: addNewRole, roleName: roles.find((r) => r.id === addNewRole)?.name ?? "Unknown role", tag: addNewTag }]);
      setAddNewRole("");
      setAddNewTag("");
    }
  };

  const startEditRole = (roleId: string) => {
    const role = iamRoles.find((x) => x.roleId === roleId);
    if (!role) return;

    setEditRole(role.roleId);
    setEditRoleTag(role.tag);
  };

  const finishEditRole = async () => {
    const res = await request("PATCH", "/api/iam-roles", { roleId: editRole, tag: editRoleTag });
    if (res.ok) {
      setIamRoles((prev) =>
        prev.map((x) => {
          if (x.roleId === editRole) {
            return { ...x, tag: editRoleTag };
          }
          return x;
        })
      );
      setEditRole("");
      setEditRoleTag("");
    }
  };

  const deleteRole = async () => {
    const res = await request("DELETE", "/api/iam-roles", { id: deleteRoleId });

    if (res.ok) {
      setIamRoles((prev) => prev.filter((x) => x.roleId !== deleteRoleId));
      setDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1>!iam Roles</h1>

        <Skeleton className="w-full h-12 m-2" />
        <Skeleton className="w-36 h-8 m-2" />
        <Skeleton className="w-full h-8 m-2" />
        <Skeleton className="w-36 h-8 m-2" />
        <Skeleton className="w-full h-8 m-2" />
        <Skeleton className="w-36 h-8 m-2" />
        <Skeleton className="w-36 h-8 m-2" />
        <Skeleton className="w-full h-8 m-2" />
        <Skeleton className="w-36 h-8 m-2" />
        <Skeleton className="w-36 h-8 m-2" />
        <Skeleton className="w-full h-8 m-2" />
      </div>
    );
  }

  return (
    <div>
      <h1>!iam Roles</h1>
      <p>
        Here you can configure roles that users can grab by running !iam &lt;rolename&gt;.
      </p>
      <Card className="flex flex-col gap-2 p-4 my-2">
        <h2>Add an !iam role</h2>
        <Select value={addNewRole} onChange={setAddNewRole} label="Role">
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              @{role.name}
            </option>
          ))}
        </Select>
        {addRoleError && <FieldError>{addRoleError}</FieldError>}

        <div className="field">
          <Label>Trigger keyword</Label>
          <Input
            type="text"
            value={addNewTag}
            onChange={setAddNewTag}
          />
          {addTagError && <FieldError>{addTagError}</FieldError>}
        </div>

        <Button
          className="mt-4"
          isDisabled={!addNewRole || !addNewTag || !!addRoleError || !!addTagError}
          onClick={addNew}
        >
          Add
        </Button>
      </Card>

      <table className="mt-4">
        <thead>
          <tr>
            <th>Role</th>
            <th>Trigger</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {iamRoles.map((iamRole) => (
            <tr key={iamRole.roleId}>
              <td>@{iamRole.roleName}</td>
              <td>
                {editRole && iamRole.roleId === editRole
                  ? <Input value={editRoleTag} onChange={setEditRoleTag} />
                  : iamRole.tag}
              </td>
              <td className="flex gap-2">
                {iamRole.roleId !== editRole && <Button isDisabled={!!editRole} onClick={() => startEditRole(iamRole.roleId)}>Edit</Button>}
                {editRole && iamRole.roleId === editRole && <Button onClick={finishEditRole}>Save</Button>}
                <Button
                  variant="danger"
                  onClick={() => {
                    setDeleteRoleId(iamRole.roleId);
                    setDeleteModalOpen(true);
                  }}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete !iam role?"
        actions={
          <>
            <Button onClick={deleteRole} variant="danger">Delete</Button>
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
          </>
        }
      >
        This action is irreversible, you'll have to re-add the role manually.
      </Modal>
    </div>
  );
};

export default ReactionRoles;
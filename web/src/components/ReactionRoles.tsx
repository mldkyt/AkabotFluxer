import { useEffect, useState } from "react";
import { request } from "../util.ts";
import { Button, Input, Label, Select } from "./ui/index.ts";

const ReactionRoles = () => {
  const [iamRoles, setIamRoles] = useState<{ roleId: string; roleName: string; tag: string }[]>([]);
  const [roles, setRoles] = useState<{ name: string; id: string }[]>([]);

  const [addNewRole, setAddNewRole] = useState("");
  const [addNewTag, setAddNewTag] = useState("");

  const [editRole, setEditRole] = useState("");
  const [editRoleTag, setEditRoleTag] = useState("");

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

  const deleteRole = async (roleId: string) => {
    const res = await request("DELETE", "/api/iam-roles", { id: roleId });

    if (res.ok) {
      setIamRoles((prev) => prev.filter((x) => x.roleId !== roleId));
    }
  };

  return (
    <div>
      <h1>Reaction Roles</h1>
      <p>Let members grab roles by running !iam &lt;rolename&gt;.</p>

      <div className="flex flex-col gap-2">
        <Select value={addNewRole} onChange={setAddNewRole} label="Role">
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              @{role.name}
            </option>
          ))}
        </Select>

        <div className="field">
          <Label>Trigger keyword</Label>
          <Input
            type="text"
            value={addNewTag}
            onChange={setAddNewTag}
          />
        </div>

        <Button
          isDisabled={!addNewRole || !addNewTag || !!addRoleError || !!addTagError}
          onClick={addNew}
        >
          Add
        </Button>
      </div>

      <table>
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
                    if (confirm("Delete this !iam role? This action is irreversible.")) {
                      deleteRole(iamRole.roleId);
                    }
                  }}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReactionRoles;
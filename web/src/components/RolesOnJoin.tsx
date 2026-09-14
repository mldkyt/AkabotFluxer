import { useEffect, useState } from "react";
import { request } from "../util.ts";
import { Button, Select } from "./ui/index.ts";

const RolesOnJoin = () => {
  const [rolesOnJoin, setRolesOnJoin] = useState<{ id: string; name: string }[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);

  const [addNewRoleId, setAddNewRoleId] = useState("");

  const getData = async () => {
    const rolesOnJoinFetch = await request("GET", "/api/roles-on-join");
    if (rolesOnJoinFetch.ok) {
      setRolesOnJoin(rolesOnJoinFetch.data);
    }

    const rolesFetch = await request("GET", "/api/roles");
    if (rolesFetch.ok) {
      setRoles(rolesFetch.data);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const addNewRole = async () => {
    if (!addNewRoleId) return;
    const res = await request("POST", "/api/roles-on-join");

    if (!res.ok) return;

    const addedRole = roles.find((r) => r.id === addNewRoleId);
    setAddNewRoleId("");
    if (addedRole) {
      setRolesOnJoin([...rolesOnJoin, addedRole]);
    }
  };

  const deleteRole = async (roleId: string) => {
    const res = await request("DELETE", "/api/roles-on-join", {
      roleId: roleId,
    });

    if (!res.ok) return;

    setAddNewRoleId("");
    setRolesOnJoin(rolesOnJoin.filter((r) => r.id !== roleId));
  };

  return (
    <div>
      <h2>Roles on Join</h2>
      <div className="flex flex-col gap-2">
        <Select value={addNewRoleId} onChange={setAddNewRoleId} label="Role">
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              @{role.name}
            </option>
          ))}
        </Select>
        <Button onClick={addNewRole} isDisabled={!addNewRoleId}>Add</Button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rolesOnJoin.map((role) => (
            <tr key={role.id}>
              <td>{role.name}</td>
              <td className="flex gap-2">
                <Button
                  variant="danger"
                  onClick={() => deleteRole(role.id)}
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

export default RolesOnJoin;
import { Button, Label, ListBox, Select, Surface, Table, toast, Typography } from "@heroui/react";
import { useEffect, useState } from "react";

const RolesOnJoin = () => {
  const [rolesOnJoin, setRolesOnJoin] = useState<{ id: string; name: string }[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);

  const [addNewRoleId, setAddNewRoleId] = useState("");

  const getData = async () => {
    const resRolesOnJoin = await fetch("/api/roles-on-join", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!resRolesOnJoin.ok) {
      toast.danger(await resRolesOnJoin.text());
      return;
    }

    const resRoles = await fetch("/api/roles", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!resRoles.ok) {
      toast.danger(await resRoles.text());
      return;
    }

    const rolesOnJoinJson = await resRolesOnJoin.json();
    const rolesJson = await resRoles.json();

    setRolesOnJoin(rolesOnJoinJson);
    setRoles(rolesJson);
  };

  useEffect(() => {
    getData();
  }, []);

  const addNewRole = async () => {
    const res = await fetch("/api/roles-on-join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        roleId: addNewRoleId,
      }),
    });

    if (!res.ok) {
      toast.danger(await res.text());
      return;
    }

    const addedRole = roles.find((r) => r.id === addNewRoleId);
    setAddNewRoleId("");
    if (addedRole) {
      setRolesOnJoin([...rolesOnJoin, addedRole]);
    }
  };

  const deleteRole = async (roleId: string) => {
    const res = await fetch("/api/roles-on-join", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        roleId: roleId,
      }),
    });

    if (!res.ok) {
      toast.danger(await res.text());
      return;
    }
    setAddNewRoleId("");
    setRolesOnJoin(rolesOnJoin.filter((r) => r.id !== roleId));
  };

  return (
    <div>
      <Typography type="h1">Roles on Join</Typography>

      <Surface className="p-2 flex flex-col gap-2 my-2 rounded-lg">
        <Select
          value={addNewRoleId}
          variant="secondary"
          onChange={(x) => setAddNewRoleId(x?.toString() ?? "")}
        >
          <Label>Role</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {roles.map((role) => (
                <ListBox.Item key={role.id} id={role.id} textValue={role.name}>
                  <Typography>@{role.name}</Typography>
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <Button onClick={addNewRole}>Add</Button>
      </Surface>

      <Table>
        <Table.ScrollContainer>
          <Table.Content>
            <Table.Header>
              <Table.Column isRowHeader>Role</Table.Column>
              <Table.Column>Actions</Table.Column>
            </Table.Header>
            <Table.Body>
              {rolesOnJoin.map((role) => (
                <Table.Row key={role.id}>
                  <Table.Cell>
                    {role.name}
                  </Table.Cell>
                  <Table.Cell className="flex gap-2">
                    <Button
                      variant="danger"
                      onClick={() => deleteRole(role.id)}
                    >
                      Delete
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </div>
  );
};

export default RolesOnJoin;

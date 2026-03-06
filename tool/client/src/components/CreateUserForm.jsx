import React, { useState } from 'react';
import { Label } from './ui/Label.jsx';
import { Input } from './ui/Input.jsx';
import { Button } from './ui/Button.jsx';
import { Loader2, Globe, Mail, Lock, Hash, User, Users } from 'lucide-react';

function CreateUserForm({ isRunning, onSubmit }) {
    const [baseUrl, setBaseUrl] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyId, setCompanyId] = useState('');
    const [name, setName] = useState('');
    const [numberOfUsers, setNumberOfUsers] = useState(3);

    const canSubmit = baseUrl.trim() && email.trim() && password.trim() && companyId.trim() && name.trim() && numberOfUsers > 0 && !isRunning;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({
            baseUrl: baseUrl.trim(),
            email: email.trim(),
            password: password.trim(),
            companyId: companyId.trim(),
            name: name.trim(),
            numberOfUsers: Number(numberOfUsers),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Base URL */}
            <div className="space-y-2">
                <Label htmlFor="cu-baseUrl" className="flex items-center gap-2">
                    <div className="p-1 rounded bg-blue-50 text-blue-600">
                        <Globe className="size-3.5" />
                    </div>
                    Domain / Base URL
                </Label>
                <Input
                    id="cu-baseUrl"
                    placeholder="https://example.customvirtual.app"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="bg-white/80"
                />
                <p className="text-[10px] text-muted-foreground pl-1">The target environment URL (without trailing slash)</p>
            </div>

            {/* Credentials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="cu-email" className="flex items-center gap-2">
                        <div className="p-1 rounded bg-violet-50 text-violet-600">
                            <Mail className="size-3.5" />
                        </div>
                        Superadmin Email
                    </Label>
                    <Input
                        id="cu-email"
                        type="email"
                        placeholder="admin@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-white/80"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="cu-password" className="flex items-center gap-2">
                        <div className="p-1 rounded bg-violet-50 text-violet-600">
                            <Lock className="size-3.5" />
                        </div>
                        Superadmin Password
                    </Label>
                    <Input
                        id="cu-password"
                        type="password"
                        placeholder="********"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-white/80"
                    />
                </div>
            </div>

            {/* Name Field */}
            <div className="space-y-2">
                <Label htmlFor="cu-name" className="flex items-center gap-2">
                    <div className="p-1 rounded bg-emerald-50 text-emerald-600">
                        <User className="size-3.5" />
                    </div>
                    Name
                </Label>
                <Input
                    id="cu-name"
                    placeholder="e.g. Automation"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white/80"
                />
                <p className="text-[10px] text-muted-foreground pl-1">
                    Used as prefix for first name, last name & username 
                    <span className="text-emerald-600 font-medium ml-1">(e.g. Automation1, Automation1718..., automation_1718..._1)</span>
                </p>
            </div>

            {/* Company ID and User Count Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="cu-companyId" className="flex items-center gap-2">
                        <div className="p-1 rounded bg-blue-50 text-blue-600">
                            <Hash className="size-3.5" />
                        </div>
                        Company ID
                    </Label>
                    <Input
                        id="cu-companyId"
                        placeholder="e.g. 204542"
                        value={companyId}
                        onChange={(e) => setCompanyId(e.target.value)}
                        className="bg-white/80"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="cu-count" className="flex items-center gap-2">
                        <div className="p-1 rounded bg-emerald-50 text-emerald-600">
                            <Users className="size-3.5" />
                        </div>
                        Number of Users
                    </Label>
                    <Input
                        id="cu-count"
                        type="number"
                        min={1}
                        max={50}
                        value={numberOfUsers}
                        onChange={(e) => setNumberOfUsers(e.target.value)}
                        className="bg-white/80"
                    />
                </div>
            </div>

            {/* Submit Button */}
            <Button 
                type="submit" 
                disabled={!canSubmit} 
                size="lg"
                className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 border-emerald-700"
            >
                {isRunning ? (
                    <>
                        <Loader2 className="size-4 animate-spin" />
                        Creating Users...
                    </>
                ) : (
                    <>
                        <Users className="size-4" />
                        Create Users
                    </>
                )}
            </Button>

            {!canSubmit && !isRunning && (
                <p className="text-xs text-center text-muted-foreground">
                    Fill in all fields to proceed
                </p>
            )}
        </form>
    );
}

export default CreateUserForm;

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { 
  Plus, 
  Search, 
  Sparkles, 
  Image as ImageIcon, 
  Shirt, 
  Dumbbell, 
  Plane, 
  UtensilsCrossed, 
  Palette, 
  Cpu, 
  Star,
  Copy,
  Pencil,
  Trash2,
  Loader2
} from "lucide-react";
import { getLoginUrl } from "@/const";

const categoryIcons: Record<string, React.ReactNode> = {
  product: <ImageIcon className="w-5 h-5" />,
  lifestyle: <Star className="w-5 h-5" />,
  fashion: <Shirt className="w-5 h-5" />,
  fitness: <Dumbbell className="w-5 h-5" />,
  travel: <Plane className="w-5 h-5" />,
  food: <UtensilsCrossed className="w-5 h-5" />,
  beauty: <Sparkles className="w-5 h-5" />,
  tech: <Cpu className="w-5 h-5" />,
  custom: <Palette className="w-5 h-5" />,
};

const categoryColors: Record<string, string> = {
  product: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  lifestyle: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  fashion: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  fitness: "bg-green-500/20 text-green-400 border-green-500/30",
  travel: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  food: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  beauty: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  tech: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  custom: "bg-primary/20 text-primary border-primary/30",
};

export default function Templates() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "custom" as const,
    promptTemplate: "",
    stylePreset: "realistic" as const,
    characterWeight: 80,
    keepOutfit: false,
    isPublic: false,
  });

  const { data: templates, isLoading, refetch } = trpc.templates.list.useQuery(
    selectedCategory !== "all" ? { category: selectedCategory } : undefined,
    { enabled: isAuthenticated }
  );

  const createMutation = trpc.templates.create.useMutation({
    onSuccess: () => {
      toast.success("Template created successfully!");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.templates.update.useMutation({
    onSuccess: () => {
      toast.success("Template updated successfully!");
      setEditingTemplate(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.templates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const useMutation = trpc.templates.use.useMutation();

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "custom",
      promptTemplate: "",
      stylePreset: "realistic",
      characterWeight: 80,
      keepOutfit: false,
      isPublic: false,
    });
  };

  const handleSubmit = () => {
    if (editingTemplate) {
      updateMutation.mutate({
        id: editingTemplate.id,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      category: template.category,
      promptTemplate: template.promptTemplate,
      stylePreset: template.stylePreset || "realistic",
      characterWeight: template.characterWeight || 80,
      keepOutfit: template.keepOutfit || false,
      isPublic: template.isPublic || false,
    });
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied to clipboard!");
  };

  const handleUseTemplate = (template: any) => {
    useMutation.mutate({ id: template.id });
    navigator.clipboard.writeText(template.promptTemplate);
    toast.success("Template copied! Paste it in the Create page.");
  };

  const filteredTemplates = templates?.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const systemTemplates = filteredTemplates?.filter((t) => t.userId === null);
  const myTemplates = filteredTemplates?.filter((t) => t.userId !== null);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl font-bold mb-4">Content Templates</h1>
          <p className="text-muted-foreground mb-8">
            Sign in to access pre-built templates for faster content creation.
          </p>
          <Button asChild className="bg-primary text-primary-foreground">
            <a href={getLoginUrl()}>Sign In to Continue</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Content Templates</h1>
            <p className="text-muted-foreground mt-1">
              Pre-built prompts for faster content creation
            </p>
          </div>
          
          <Dialog open={isCreateOpen || !!editingTemplate} onOpenChange={(open) => {
            if (!open) {
              setIsCreateOpen(false);
              setEditingTemplate(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                className="bg-primary text-primary-foreground"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-card border-white/10">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? "Edit Template" : "Create New Template"}
                </DialogTitle>
                <DialogDescription>
                  {editingTemplate 
                    ? "Update your content template settings"
                    : "Create a reusable prompt template for content generation"
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Beach Vacation"
                      className="bg-background border-white/10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v: any) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger className="bg-background border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="lifestyle">Lifestyle</SelectItem>
                        <SelectItem value="fashion">Fashion</SelectItem>
                        <SelectItem value="fitness">Fitness</SelectItem>
                        <SelectItem value="travel">Travel</SelectItem>
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="beauty">Beauty</SelectItem>
                        <SelectItem value="tech">Tech</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this template"
                    className="bg-background border-white/10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Prompt Template</Label>
                  <Textarea
                    value={formData.promptTemplate}
                    onChange={(e) => setFormData({ ...formData, promptTemplate: e.target.value })}
                    placeholder="Use {influencer} as a placeholder for the influencer's name..."
                    rows={4}
                    className="bg-background border-white/10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {"{influencer}"} to insert the influencer's name automatically
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Style Preset</Label>
                    <Select
                      value={formData.stylePreset}
                      onValueChange={(v: any) => setFormData({ ...formData, stylePreset: v })}
                    >
                      <SelectTrigger className="bg-background border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realistic">Realistic</SelectItem>
                        <SelectItem value="anime">Anime</SelectItem>
                        <SelectItem value="artistic">Artistic</SelectItem>
                        <SelectItem value="3d">3D Render</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Character Weight: {formData.characterWeight}%</Label>
                    <Slider
                      value={[formData.characterWeight]}
                      onValueChange={([v]) => setFormData({ ...formData, characterWeight: v })}
                      min={0}
                      max={100}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.keepOutfit}
                      onCheckedChange={(v) => setFormData({ ...formData, keepOutfit: v })}
                    />
                    <Label>Keep Same Outfit</Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.isPublic}
                      onCheckedChange={(v) => setFormData({ ...formData, isPublic: v })}
                    />
                    <Label>Share Publicly</Label>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateOpen(false);
                      setEditingTemplate(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || updateMutation.isPending || !formData.name || !formData.promptTemplate}
                    className="bg-primary text-primary-foreground"
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {editingTemplate ? "Update" : "Create"} Template
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="pl-10 bg-card border-white/10"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-48 bg-card border-white/10">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="lifestyle">Lifestyle</SelectItem>
              <SelectItem value="fashion">Fashion</SelectItem>
              <SelectItem value="fitness">Fitness</SelectItem>
              <SelectItem value="travel">Travel</SelectItem>
              <SelectItem value="food">Food</SelectItem>
              <SelectItem value="beauty">Beauty</SelectItem>
              <SelectItem value="tech">Tech</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Templates */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-card border border-white/10">
            <TabsTrigger value="all">All Templates</TabsTrigger>
            <TabsTrigger value="system">System Templates</TabsTrigger>
            <TabsTrigger value="my">My Templates</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredTemplates?.length === 0 ? (
              <div className="text-center py-20">
                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No templates found</h3>
                <p className="text-muted-foreground">
                  Create your first template to get started
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates?.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUse={handleUseTemplate}
                    onCopy={handleCopyPrompt}
                    onEdit={handleEdit}
                    onDelete={(id) => deleteMutation.mutate({ id })}
                    isOwner={template.userId === user?.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="system" className="space-y-6">
            {systemTemplates?.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">No system templates available</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {systemTemplates?.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUse={handleUseTemplate}
                    onCopy={handleCopyPrompt}
                    onEdit={handleEdit}
                    onDelete={(id) => deleteMutation.mutate({ id })}
                    isOwner={false}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="my" className="space-y-6">
            {myTemplates?.length === 0 ? (
              <div className="text-center py-20">
                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No custom templates yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your own templates for faster content creation
                </p>
                <Button 
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-primary text-primary-foreground"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myTemplates?.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUse={handleUseTemplate}
                    onCopy={handleCopyPrompt}
                    onEdit={handleEdit}
                    onDelete={(id) => deleteMutation.mutate({ id })}
                    isOwner={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function TemplateCard({ 
  template, 
  onUse, 
  onCopy, 
  onEdit, 
  onDelete, 
  isOwner 
}: { 
  template: any;
  onUse: (t: any) => void;
  onCopy: (prompt: string) => void;
  onEdit: (t: any) => void;
  onDelete: (id: number) => void;
  isOwner: boolean;
}) {
  return (
    <Card className="bg-card border-white/10 hover:border-primary/50 transition-colors group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${categoryColors[template.category] || categoryColors.custom}`}>
              {categoryIcons[template.category] || categoryIcons.custom}
            </div>
            <div>
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <CardDescription className="text-xs mt-1">
                {template.description || "No description"}
              </CardDescription>
            </div>
          </div>
          {template.userId === null && (
            <Badge variant="outline" className="text-xs border-primary/50 text-primary">
              System
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-background/50 rounded-lg p-3 text-sm text-muted-foreground line-clamp-3">
          {template.promptTemplate}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            {template.stylePreset || "realistic"}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Weight: {template.characterWeight || 80}%
          </Badge>
          {template.keepOutfit && (
            <Badge variant="secondary" className="text-xs">
              Keep Outfit
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            Used {template.usageCount || 0}x
          </Badge>
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={() => onUse(template)}
            className="flex-1 bg-primary text-primary-foreground"
          >
            Use Template
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCopy(template.promptTemplate)}
          >
            <Copy className="w-4 h-4" />
          </Button>
          {isOwner && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(template)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-400 hover:text-red-300"
                onClick={() => onDelete(template.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
